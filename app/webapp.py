import streamlit as st
import subprocess
import os
import uuid
from atk_conformer_generation.utils import *
from rdkit import Chem
from rdkit.Chem import AllChem, Draw
from rdkit.Chem.rdmolfiles import SDMolSupplier
import pandas as pd
from io import BytesIO
import warnings
import numpy as np
import time
import glob
import re
import base64
from pyscf import gto
from pyscf.geomopt import geometric_solver
from gpu4pyscf.dft import rks
from pyscf.hessian import thermo


def add_custom_header_and_footer(header_and_footer_color, logo_image_path, header_background_path, background_image, title, subtitle, more_info_url):
    """Adds custom header with animated subtitle, GitHub link button, and footer to the app."""
    with open(logo_image_path, "rb") as image_file:
        logo_image = base64.b64encode(image_file.read()).decode()

    with open(header_background_path, "rb") as image_file:
        header_background = base64.b64encode(image_file.read()).decode()

    with open(background_image, "rb") as image_file:
        background_image = base64.b64encode(image_file.read()).decode()

    st.markdown(
        f"""
        <style>
            .stApp {{
                background: linear-gradient(rgba(255, 255, 255, 0.8), rgba(255, 255, 255, 0.8)), 
                            url(data:image/jpeg;base64,{background_image});
                background-size: cover;
                background-repeat: no-repeat;
                background-attachment: fixed;
                background-blend-mode: lighten; /* Optional: Adjust blend mode */
            }}
        </style>
        """,
        unsafe_allow_html=True
    )

    header_css = f'''
    <style>
        [data-testid="stAppViewContainer"] {{
            padding: 0;
        }}
        [data-testid="stHeader"] {{
            display: none; /* Remove default Streamlit header */
        }}
        @keyframes popIn {{
            0% {{ opacity: 0; transform: scale(0.5); }}
            100% {{ opacity: 1; transform: scale(1); }}
        }}
        
        .custom-header {{
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            background: linear-gradient(to right, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.0)),
                        url(data:image/jpeg;base64,{header_background}) no-repeat center;
            background-size: cover;
            box-shadow: 0px 4px 15px rgba(0, 0, 0, 0.2);
            padding: 5px 10px;
            z-index: 1000;
            display: flex;
            align-items: center;
            height: 80px; /* Height for the header */
        }}

        .custom-header .center-content {{
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            flex: 1;
            text-align: center;
        }}

        .custom-header .title {{
            font-family: "Times New Roman", serif;
            font-size: 25px;
            font-weight: bold;
            color: {header_and_footer_color};
            margin: 0;
        }}
        
        .custom-header .subtitle {{
            font-family: "Times New Roman", serif;
            font-size: 16px;
            color: {header_and_footer_color};
            margin: 0;
            display: flex;
            gap: 5px;
        }}

        .custom-header img {{
            height: 40px;
            margin-left: 9px;
        }}

        .custom-footer {{
            position: fixed;
            bottom: 0;
            left: 0;
            width: 100%;
            background: {header_and_footer_color};
            color: white;
            text-align: center;
            padding: 8px 0;
            font-size: 14px;
            z-index: 1000;
        }}
    </style>
    <div class="custom-header">
        <img src="data:image/jpeg;base64,{logo_image}" alt="Logo" />
        <div class="center-content">
            <div class="title">{title}</div>
            <div class="subtitle">{subtitle}</div>
        </div>
        <div class="moreinfo-button">
            <a href="{more_info_url}" target="_blank"
               style="background-color: {header_and_footer_color}; color: white; text-decoration: none; 
                      border: none; border-radius: 10px; padding: 8px 10px; font-size: 14px;">
                More information
            </a>
        </div>
    </div>
    <div class="custom-footer">
        Confidential and Proprietary. Copyright © 2017-25 Aganitha
    </div>
    '''
    st.markdown(header_css, unsafe_allow_html=True)


def add_custom_css():
    """Add consolidated custom CSS for the application."""
    st.markdown(
        """
        <style>
            /* Sidebar styling */
            [data-testid="stSidebar"] {
                width: 350px !important;
                position: fixed !important;
                left: 15px;
                top: 0 !important;
                height: 80vh !important;
                overflow: auto !important;
                background: #d4d7dc;
                z-index: 10;
                margin-top: 100px;
                color: #31473A;
                border: 0px solid #31473A;
                box-shadow: 0px 4px 15px rgba(0, 0, 0, 0.2);
                backdrop-filter: blur(5px);
                border-radius: 15px;
                padding: 10px;
            }

            [data-testid="stSidebar"] > div:first-child {
                margin-top: -80px !important;
            }

            [data-testid="stAppViewContainer"] {
                margin-left: 350px !important;
                padding: 1rem;
                width: calc(100% - 350px) !important;
            }

            [data-testid="stSidebar"] {
                overflow-x: hidden !important;
            }

            .block-container {
                padding: 2.5rem 2rem;
                max-width: 100% !important;
            }
    
            div[data-testid="stTabs"] hr {
                display: none !important; /* Hide horizontal line if present */
            }
    
            /* Default styling for all tabs */
            div[data-testid="stTabs"] button {
                background-color: #d4d7dc; /* Tab background color */
                color: black; /* Tab text color */
                font-size: 22px; /* Increase font size */
                padding: 10px 15px; /* Add padding for better appearance */
                border: none; /* Remove default border */
                border-radius: 15px 15px 0px 0px; /* Round top corners only */
                transition: background-color 0.3s ease; /* Smooth transition */
            }
    
            /* Styling for hovered tabs */
            div[data-testid="stTabs"] button:hover {
                background-color: #d4d7dc; /* Background color on hover */
                color: black; /* Hover text color */
            }
    
            /* Styling for the active (selected) tab */
            div[data-testid="stTabs"] button[aria-selected="true"] {
                background-color: #6a8f6b !important; /* Active tab background color */
                color: white !important; /* Active tab text color */
            }
    
            /* Ensure container styling remains consistent */
            div[data-testid="stTabs"] {
                margin-top: 12px !important;
                margin-left: 0 !important;
                margin-right: 0 !important;
                width: 100% !important;
            }

            [data-testid='stFileUploader'] {
                width: max-content;
            }
            [data-testid='stFileUploader'] section {
                padding: 0;
                float: left;
            }
            [data-testid='stFileUploader'] section > input + div {
                display: none;
            }
            [data-testid='stFileUploader'] section + div {
                float: right;
                padding-top: 0;
            }

            /* File uploader styling */
            div[data-testid="stFileUploader"] {
                div div {display: none !important;}
                label {color: blue !important;}
                margin-top: -0.5rem !important;
            }
            
            /* Radio button adjustments */
            div[data-baseweb="radio"] > div {
                gap: 0.5rem !important;
            }

            div[data-testid="stRadio"] > label {
                color: blue !important;
                font-size: 1rem !important;
                margin-top: 1rem !important;
                margin-bottom: 0.0rem !important;
            }



            input[type="text"] {
                width: 100% !important;
            }

            /* Button styling */
            div.stButton > button {
                background-color: #dde7dd !important;
                color: black !important;
                padding: 8px 20px !important;
                border-radius: 10px !important;
                font-size: 18px !important;
                border: 0px solid #282d56 !important;
                box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.2) !important;
                cursor: pointer !important;
                transition: all 0.2s ease-in-out;
            }

            div.stButton > button:hover {
                background-color: #6a8f6b !important;
                color: white !important;
                box-shadow: 0px 6px 8px rgba(0, 0, 0, 0.3) !important;
            }

            /* Custom CSS for the download button */
            .download-button {
                background-color: #dde7dd; 
                color: black; 
                text-decoration: none; 
                padding: 10px 20px; 
                border-radius: 5px; 
                font-size: 14px; 
                transition: background-color 0.3s ease;
            }
            .download-button:visited {
                color: black; /* Ensure visited links stay black */
            }
            .download-button:hover {
                background-color: #6a8f6b; 
                color: white; 
                text-decoration: none; /* Prevent underline on hover */
            }
            
        </style>
        """,
        unsafe_allow_html=True,
    )
header_and_footer_color = "#282d56"
logo_image_path = "aganitha-logo.png"
header_background_path = "header_background.png"
background_image = "back_ground.jpg"
title = "AutoDFT"
subtitle = "An automated platform to run fast Density Functional Theory (DFT) calculations"
more_info_url = ""
    
add_custom_header_and_footer(header_and_footer_color, logo_image_path, header_background_path, 
                                background_image, title, subtitle, more_info_url)
add_custom_css()

warnings.filterwarnings("ignore", category=UserWarning, module="scipy.cluster")

def read_xyz_content(content: str) -> Chem.Mol:
    """Reads XYZ content, adds bonds based on distances, and returns an RDKit molecule."""
    lines = content.strip().splitlines()
    num_atoms = int(lines[0].strip())  # First line is the number of atoms
    atom_block = lines[2:]  # Skip the first two lines (num_atoms and comment line)

    # Create RDKit molecule
    mol = Chem.RWMol()
    conformer = Chem.Conformer(num_atoms)
    positions = []

    # Add atoms and positions
    for i, line in enumerate(atom_block):
        parts = line.split()
        symbol = parts[0]
        x, y, z = map(float, parts[1:])
        positions.append((x, y, z))

        atom = Chem.Atom(symbol)
        mol.AddAtom(atom)
        conformer.SetAtomPosition(i, (x, y, z))

    # Add conformer
    mol.AddConformer(conformer, assignId=True)

    # Infer bonds based on distances
    positions = np.array(positions)
    for i in range(num_atoms):
        for j in range(i + 1, num_atoms):
            distance = np.linalg.norm(positions[i] - positions[j])
            # Add a bond if distance is less than a threshold (e.g., 1.6 Å for covalent bonds)
            if distance < 1.6:
                mol.AddBond(i, j, Chem.BondType.SINGLE)

    # Sanitize molecule
    Chem.SanitizeMol(mol)

    return mol

def read_mol2_content(content: str) -> Chem.Mol:
    """Reads MOL2 content and returns an RDKit molecule."""
    mol = Chem.MolFromMol2Block(content, removeHs=False)
    if mol is None:
        raise ValueError("Could not parse MOL2 content.")
    return mol

def read_pdb_content(content: str) -> Chem.Mol:
    """Reads PDB content and returns an RDKit molecule."""
    mol = Chem.MolFromPDBBlock(content, removeHs=False)
    if mol is None:
        raise ValueError("Could not parse PDB content.")
    return mol

def read_structure_content(content: str, filetype: str) -> Chem.Mol:
    """Reads structure content (XYZ, MOL2, PDB) and returns an RDKit molecule."""
    if filetype.lower() == 'xyz':
        return read_xyz_content(content)
    elif filetype.lower() == 'mol2':
        return read_mol2_content(content)
    elif filetype.lower() == 'pdb':
        return read_pdb_content(content)
    else:
        raise ValueError(f"Unsupported file type: {filetype}")

def render_molecule(molecule: Chem.Mol) -> str:
    """Renders an RDKit molecule as an HTML 3D visualization."""
    if molecule is not None:
        molecule = Chem.AddHs(molecule)
        AllChem.EmbedMolecule(molecule)
        AllChem.UFFOptimizeMolecule(molecule)
        sdf_output = Chem.MolToMolBlock(molecule)

        html_template = f"""
        <div id="molViewer" style="height: 600px; width: 800px;"></div>
        <script src="https://3Dmol.org/build/3Dmol-min.js"></script>
        <script>
            let viewer = new $3Dmol.createViewer(document.getElementById('molViewer'), {{backgroundColor: "white"}});
            viewer.addModel(`{sdf_output}`, 'sdf');
            viewer.setStyle({{stick: {{}}}});
            viewer.zoomTo();
            viewer.render();
        </script>
        """
        return html_template
    else:
        raise ValueError("Invalid molecule object.")

# Render the SDF molecule in 3D
def render_sdf(sdf_output: str):
    molecule = Chem.MolFromMolBlock(sdf_output)
    if molecule is not None:
        molecule = Chem.AddHs(molecule)
        AllChem.EmbedMolecule(molecule)
        AllChem.UFFOptimizeMolecule(molecule)
        sdf_output = Chem.MolToMolBlock(molecule)

    html_template = f"""
    <div id="molViewer" style="height: 600px; width: 800px;"></div>
    <script src="https://3Dmol.org/build/3Dmol-min.js"></script>
    <script>
        let viewer = new $3Dmol.createViewer(document.getElementById('molViewer'), {{backgroundColor: "white"}});
        viewer.addModel(`{sdf_output}`, 'sdf');
        viewer.setStyle({{stick: {{}}}});
        viewer.zoomTo();
        viewer.render();
    </script>
    """
    return html_template


def render_sdf_all(file_path: str, stick_radius: float = 0.1):
    # Use Chem.SDMolSupplier to read molecules from the SDF file
    suppl = Chem.SDMolSupplier(file_path)
    
    # Initialize the HTML template
    html_template = """
    <div id="molViewer" style="height: 600px; width: 800px;"></div>
    <script src="https://3Dmol.org/build/3Dmol-min.js"></script>
    <script>
        let viewer = new $3Dmol.createViewer(document.getElementById('molViewer'), {backgroundColor: "white"});
    """

    # Iterate over each molecule in the SDF
    for molecule in suppl:
        if molecule is not None:
            print("Molecule found, processing...")
            molecule = Chem.AddHs(molecule)
            AllChem.EmbedMolecule(molecule)
            AllChem.UFFOptimizeMolecule(molecule)
            mol_block = Chem.MolToMolBlock(molecule)
            
            # Add each molecule to the viewer
            html_template += f"""
            viewer.addModel(`{mol_block}`, 'sdf');
            """
        else:
            st.write("Invalid molecule encountered.")

    # Finalize the HTML template with stick style
    html_template += f"""
        viewer.setStyle({{stick: {{radius: {stick_radius}}}}});
        viewer.zoomTo();
        viewer.render();
    </script>
    """
    
    return html_template


def render_molecule_all(molecule_list: list[Chem.Mol], stick_radius: float = 0.1) -> str:
    """Renders RDKit molecules as an HTML 3D visualization."""
    html_template = """
    <div id="molViewer" style="height: 600px; width: 800px;"></div>
    <script src="https://3Dmol.org/build/3Dmol-min.js"></script>
    <script>
        let viewer = new $3Dmol.createViewer(document.getElementById('molViewer'), {backgroundColor: "white"});
    """
    
    labels = ['Original', 'Optimized']  # Define labels for the two molecules
    for index, molecule in enumerate(molecule_list):
        if molecule is not None:
            molecule = Chem.AddHs(molecule)
            AllChem.EmbedMolecule(molecule)
            AllChem.UFFOptimizeMolecule(molecule)
            sdf_output = Chem.MolToMolBlock(molecule)

            html_template += f"""
                viewer.addModel(`{sdf_output}`, 'sdf');
                viewer.setStyle({{stick: {{radius: {stick_radius}}}}});
            """
        else:
            raise ValueError("Invalid molecule object.")
    
    html_template += """
    viewer.zoomTo();
    viewer.render();
    </script>
    """
    return html_template
    


def get_atom_list(sdf_file):
    molecules = Chem.SDMolSupplier(sdf_file, removeHs=False)
    mol = next(molecules)  # Assuming you have one molecule in the SDF

    # Get the first conformer to access 3D coordinates
    conformer = mol.GetConformer()

    # Extract atomic symbols and coordinates
    atom_list = []
    for atom in mol.GetAtoms():
        pos = conformer.GetAtomPosition(atom.GetIdx())
        atom_list.append((atom.GetSymbol(), (pos.x, pos.y, pos.z)))
    return atom_list


def opti_PCM(mol, functional, eps, xyz_filename):
    # Set up the DFT calculation
    mf = rks.RKS(mol).density_fit()  # Use density fitting for efficiency
    mf.xc = functional  # Set the exchange-correlation functional

    # SCF convergence Criteria
    mf.conv_tol = 1e-8  # Energy convergence
    mf.conv_tol_grad = 3e-4  # Gradient convergence
    mf.max_cycle = 70  # Increase max iterations if needed

    # Apply the solvation model
    mf = mf.PCM()  # Initialize solvation model
    mf.grids.atom_grid = (99, 590)
    mf.with_solvent.lebedev_order = 29  # 302 Lebedev grids
    mf.with_solvent.method = 'IEF-PCM'  # Can be C-PCM, SS(V)PE, COSMO
    mf.with_solvent.eps = eps  # Set the solvent's dielectric constant

    # Perform geometry optimization
    print("Starting geometry optimization...")
    mol_opt = geometric_solver.optimize(mf, max_steps=200, xtol=1e-8, gtol=3e-4, etol=1e-8)

    # Ensure SCF calculation is performed
    mf.kernel()

    # Output optimized geometry
    optimized_atoms = [(atom[0], mol_opt.atom_coords(unit='Angstrom')[i]) for i, atom in enumerate(mol_opt.atom)]

    # Extract the final energy in Hartree
    final_energy_hartree = mf.e_tot

    # Convert energy from Hartree to kJ/mol
    hartree_to_kjmol = 2625.5
    final_energy_kjmol = final_energy_hartree * hartree_to_kjmol

    # Save optimized geometry to XYZ file
    with open(xyz_filename, 'w') as xyz_file:
        xyz_file.write(f"{len(optimized_atoms)}\n")
        xyz_file.write(f"Energy: {final_energy_kjmol:.2f} kJ/mol\n")
        for symbol, coords in optimized_atoms:
            formatted_coords = ' '.join(f"{coord:.8f}" for coord in coords)
            xyz_file.write(f"{symbol} {formatted_coords}\n")

    print(f"Optimized geometry saved to '{xyz_filename}'.")

    # Print the final energy
    print(f"Final energy: {final_energy_hartree:.8f} Hartree ({final_energy_kjmol:.2f} kJ/mol)")

    # Record the end time
    opt_time = time.time()

    # Calculate and print the total run time
    total_opt_time = opt_time - start_time
    print(f"\nOPT Time: {total_opt_time:.2f} seconds")

    print("################################################################")
    return mol_opt, final_energy_kjmol

# Inputs
inp_smiles = st.sidebar.text_input("Input SMILES *", value="")
ref_confo_file = st.sidebar.file_uploader("Molecule for geometry optimization", type=["sdf"], help="Upload a molecule for geometry optimization")

# Dielectric Constant Dropdown and Custom Input
dielectric_options = {
    "Vacuum": 1.0,
    "Water": 78.5,
    "Dimethyl sulfoxide (DMSO)": 46.7,
    "Acetone": 20.7,
    "Chloroform": 4.8,
    "Others": None
}

# Create a list with formatted options (substance + dielectric constant in brackets)
formatted_dielectric_options = [
    f"{substance} ({value})" if substance != "Others" else substance
    for substance, value in dielectric_options.items()
]

# Help text for the dielectric options
help_text = (
    "Methanol | 32.7\n"
    "Ethanol | 24.3\n"
    "Acetonitrile | 36.6\n"
    "Benzene | 2.3\n"
    "Hexane | 1.9\n"
    "Toluene | 2.4\n"
    "Diethyl ether | 4.3\n"
    "Dichloromethane (DCM) | 8.9\n"
    "Dimethylformamide (DMF) | 36.7\n"
    "Ethyl acetate | 6.0\n"
    "n-Hexane | 1.9"
)

# Dropdown for dielectric constant
dielectric_choice = st.sidebar.selectbox("Dielectric Constant", options=formatted_dielectric_options, help=help_text)

# Handle the case where "Others" is selected
if dielectric_choice == "Others":
    dielectric_value = st.sidebar.number_input("Enter custom dielectric constant value", min_value=0.0, step=0.1)
else:
    # Extract numerical value based on the choice
    dielectric_value = dielectric_options[dielectric_choice.split(" (")[0]]  # Remove " (value)" part if present

# Ensure dielectric_value is a float
dielectric_value = float(dielectric_value)

if dielectric_value:
    st.sidebar.write(f"Selected Dielectric Constant: {dielectric_value}")

st.sidebar.subheader('Basic setting')
functional = st.sidebar.text_input("Functional","M06-2X")
basis = st.sidebar.text_input("Basis","def2-svpd")
charge = st.sidebar.number_input("Charge",value=0, step=1)
#spin = st.sidebar.number_input("Spin",value=0.0, step=0.5, format="%.1f")

# Optimize Button
st.markdown("""
    <style>
        .stButton>button {
            background-color: lightblue;
            color: black;
            border: none;
            padding: 10px 20px;
            font-size: 16px;
            cursor: pointer;
        }
        .stButton>button:hover {
            background-color: #add8e6;
        }
    </style>
""", unsafe_allow_html=True)

if st.sidebar.button("Optimize", type="primary"):
    tab_titles = ["Optimized Conformer"] 
    tabs = st.tabs(tab_titles)

   
    ref_confo_path = ref_confo_file.name
    with open(ref_confo_path, "wb") as f:
        f.write(ref_confo_file.getbuffer())
    ref_sdf_content = ref_confo_file.getvalue().decode("utf-8")

    with tabs[0]:  # Conformer tab
        with st.spinner():
            start_time = time.time()
            # Define eps
            eps = dielectric_value
            functional_input = functional
            atom_list = get_atom_list(ref_confo_path)
            # Define the molecule
            mol1 = gto.M(
                atom=atom_list,
                basis=basis,
                charge=charge,
                spin=0,
                verbose=4,
            )

            xyz_filename = f'{ref_confo_path.split(".")[0]}.xyz'

            HA, energy = opti_PCM(mol1, functional_input, eps, xyz_filename)
            with open(xyz_filename,'r') as f:
                ref_xyz_content = f.read()
            ref_molecule = read_structure_content(ref_xyz_content,'xyz')
            st.markdown(f"<div style='color: black; font-size: 14px; font-weight: bold; margin-top: 20px; margin-left: 20px'>Energy (kJ/mol): {energy:.2f}</div>", unsafe_allow_html=True)
            ori_molecule = Chem.MolFromMolBlock(ref_sdf_content)
            molecule_list = [ori_molecule, ref_molecule]
            file_html = render_molecule_all(molecule_list)
            st.components.v1.html(file_html, height=700, width=800)

            
    if not ref_confo_file:
        st.error("No conformer uploaded.")

        

