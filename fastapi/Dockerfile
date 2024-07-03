FROM python:3.9

WORKDIR /app

# Update the package index
RUN apt-get update

# Install packages to allow apt to use packages over HTTPS
RUN apt-get install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

# Add Docker's official GPG key
RUN curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Set up the Docker stable repository
RUN echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/debian \
  $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

# Update the package index again
RUN apt-get update

# Install Docker CLI
RUN apt-get install -y docker-ce-cli


COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

RUN mkdir uploaded_files

COPY . .

RUN mkdir -p ~/.marvin
COPY .env ~/.marvin/.env

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]