FROM ubuntu:22.04

# Install system dependencies for both CLI and Next.js
RUN apt-get update && \
    apt-get install -y wget bzip2 ca-certificates curl vim git build-essential cmake && \
    # Install Node.js (for Next.js)
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs && \
    # Clean up
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Install Miniconda
ENV CONDA_DIR=/opt/conda
ENV PATH=$CONDA_DIR/bin:$PATH

RUN wget --quiet https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-x86_64.sh -O /tmp/miniconda.sh && \
    /bin/bash /tmp/miniconda.sh -b -p $CONDA_DIR && \
    rm /tmp/miniconda.sh

# Install Mamba and Python dependencies
RUN conda install -y -c conda-forge mamba && \
    mamba install -y python=3.11 numpy pandas scipy cudatoolkit -c conda-forge

# Install Open Babel
RUN apt-get update && apt-get install -y \
    openbabel \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy the entire app folder (contains both autodft and auto-dft-nextjs)
COPY . /app

# Install Poetry and Python dependencies for CLI
RUN pip install --upgrade pip && \
    pip install poetry && \
    cd /app/autodft && \
    poetry install --no-interaction --no-ansi && \
    poetry build

# Install and build the Next.js app
WORKDIR /app/auto-dft-nextjs
RUN npm install && \
    npm run build

# Set environment variables
ENV LD_LIBRARY_PATH=/opt/conda/lib:$LD_LIBRARY_PATH
ENV UPLOAD_DIR=/app/auto-dft-nextjs/uploads

# Expose port for Next.js
EXPOSE 3000

# Start the Next.js app
CMD ["npm", "start"]

#docker run -d --gpus all -v /home/shifath/auto-dft/app/auto-dft-nextjs/uploads:/app/auto-dft-nextjs/uploads -p 3008:3000 --restart always --name next-auto-dft --label description="Next.js app for AutoDFT" next-auto-dft

