
# AutoDFT

A web application for performing DFT (Density Functional Theory) calculations and visualizing molecular structures. The app combines a Python CLI (`autodft`) for DFT computations using PySCF and a Next.js app (`auto-dft-nextjs`) for 3D molecular visualization using 3Dmol.js.

## Prerequisites

- **Docker**: Ensure Docker is installed and running.
- **NVIDIA GPU and Container Toolkit**: Required for GPU-accelerated DFT calculations.
- **Git**: To clone the repository.

## Setup and Running the App

### 1. Clone the Repository
Clone the repository to your local machine:

```bash
git clone https://github.com/<your-username>/auto-dft.git
cd auto-dft/app
```

### 2. Build the Docker Image
Build the Docker image for the combined CLI and Next.js app:

```bash
docker build -t auto-dft-app .
```

### 3. Create the Uploads Directory
Create a directory to persist uploaded and generated files:

```bash
mkdir -p auto-dft-nextjs/uploads
```

### 4. Run the Docker Container
Run the container, mapping port 3000 and mounting the uploads directory:

```bash
docker run -d --rm --gpus all -v $(pwd)/auto-dft-nextjs/uploads:/app/auto-dft-nextjs/uploads -p 3000:3000 --name auto-dft-app-container auto-dft-app
```

### 5. Access the App
Open your browser and navigate to:

```
http://localhost:3000
```

Use the sidebar to upload an SDF file (e.g., `ethanol.sdf`).  
Click "Optimize" to run DFT optimization.  
View the optimized molecule (XYZ) and energy in the visualization.

## Troubleshooting

- **Port Conflict**: If port 3000 is in use, change the port mapping (e.g., `-p 3001:3000`) and access `http://localhost:3001`.
- **GPU Errors**: Ensure the NVIDIA Container Toolkit is installed (`nvidia-smi` should work). If GPUs are unavailable, modify `autodft/app.py` to use CPU-based PySCF.
- **Logs**: Check container logs for errors:

```bash
docker logs auto-dft-app-container
```
