# Step 1: Base Image
FROM node:14

# Step 2: Set Working Directory
WORKDIR /app

# Step 3: Copy Package Files
COPY package*.json ./

# Step 4: Install Dependencies
RUN npm install

# Optional: If you're building your code for production
# RUN npm ci --only=production

# Step 5: Copy Application Files
COPY . .

# Step 6: Expose Port
EXPOSE 3000

# Step 7: Start Command
CMD ["npm", "start"]