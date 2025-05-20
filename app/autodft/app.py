import typer
from rdkit import Chem
import warnings
import numpy as np
import time
import os
from pyscf import gto
from pyscf.geomopt import geometric_solver
from gpu4pyscf.dft import rks

app = typer.Typer()


def read_xyz_content(content: str) -> Chem.Mol:
    """Reads XYZ content, adds bonds based on distances, and returns an RDKit molecule."""
    lines = content.strip().splitlines()
    num_atoms = int(lines[0].strip())
    atom_block = lines[2:]

    mol = Chem.RWMol()
    conformer = Chem.Conformer(num_atoms)
    positions = []

    for i, line in enumerate(atom_block):
        parts = line.split()
        symbol = parts[0]
        x, y, z = map(float, parts[1:])
        positions.append((x, y, z))

        atom = Chem.Atom(symbol)
        mol.AddAtom(atom)
        conformer.SetAtomPosition(i, (x, y, z))

    mol.AddConformer(conformer, assignId=True)

    positions = np.array(positions)
    for i in range(num_atoms):
        for j in range(i + 1, num_atoms):
            distance = np.linalg.norm(positions[i] - positions[j])
            if distance < 1.6:
                mol.AddBond(i, j, Chem.BondType.SINGLE)

    Chem.SanitizeMol(mol)

    return mol


def get_atom_list(sdf_file_path):
    molecules = Chem.SDMolSupplier(sdf_file_path, removeHs=False)
    mol = next(molecules)

    conformer = mol.GetConformer()

    atom_list = []
    for atom in mol.GetAtoms():
        pos = conformer.GetAtomPosition(atom.GetIdx())
        atom_list.append((atom.GetSymbol(), (pos.x, pos.y, pos.z)))
    return atom_list


def opti_PCM(mol, functional, eps, xyz_filename):
    start_time = time.time()
    mf = rks.RKS(mol).density_fit()
    mf.xc = functional

    mf.conv_tol = 1e-8
    mf.conv_tol_grad = 3e-4
    mf.max_cycle = 70

    mf = mf.PCM()
    mf.grids.atom_grid = (99, 590)
    mf.with_solvent.lebedev_order = 29
    mf.with_solvent.method = 'IEF-PCM'
    mf.with_solvent.eps = eps

    print("Starting geometry optimization...")
    mol_opt = geometric_solver.optimize(mf, max_steps=200, xtol=1e-8, gtol=3e-4, etol=1e-8)
    mf = rks.RKS(mol_opt).density_fit()
    mf.kernel()

    optimized_atoms = [(atom[0], mol_opt.atom_coords(unit='Angstrom')[i]) for i, atom in enumerate(mol_opt.atom)]

    print(f"Optimized geometry saved to '{xyz_filename}'.")

    final_energy_hartree = mf.e_tot
    hartree_to_kjmol = 2625.5
    final_energy_kjmol = final_energy_hartree * hartree_to_kjmol

    print(f"Final energy: {final_energy_hartree:.8f} Hartree ({final_energy_kjmol:.2f} kJ/mol)")
    with open(xyz_filename, 'w') as xyz_file:
        xyz_file.write(f"{len(optimized_atoms)}\n")
        xyz_file.write(f"Energy: {final_energy_kjmol:.2f} kJ/mol\n")
        for symbol, coords in optimized_atoms:
            formatted_coords = ' '.join(f"{coord:.8f}" for coord in coords)
            xyz_file.write(f"{symbol} {formatted_coords}\n")
    opt_time = time.time()
    total_opt_time = opt_time - start_time
    print(f"\nOPT Time: {total_opt_time:.2f} seconds")

    print("################################################################")
    return mol_opt, final_energy_kjmol


@app.command()
def optimize(
    sdf_file_path: str = typer.Option(..., help="Path to the molecule SDF file for geometry optimization"),
    dielectric_constant: float = typer.Option(78.5, help="Dielectric constant for the solvent model (e.g., Water = 78.5)"),
    functional: str = "M06-2X",
    basis: str = "def2-svpd",
    charge: int = 0,
    output_dir: str = typer.Option(None, help="Directory to save the optimized XYZ file")
):
    warnings.filterwarnings("ignore", category=UserWarning, module="scipy.cluster")

    try:
        atom_list = get_atom_list(sdf_file_path)
        mol1 = gto.M(
            atom=atom_list,
            basis=basis,
            charge=charge,
            spin=0,
            verbose=4,
        )
        # Determine the XYZ filename
        base_name = os.path.splitext(os.path.basename(sdf_file_path))[0]
        xyz_filename = f"{base_name}.xyz"
        if output_dir:
            os.makedirs(output_dir, exist_ok=True)
            xyz_filename = os.path.join(output_dir, xyz_filename)

        mol_opt, energy_kjmol = opti_PCM(mol1, functional, dielectric_constant, xyz_filename)

        print(f"Optimized geometry with energy: {energy_kjmol:.2f} kJ/mol")

    except Exception as e:
        typer.echo(f"Error in optimization: {str(e)}", err=True)


if __name__ == "__main__":
    app()