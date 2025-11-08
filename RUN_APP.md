# How to Run Whisper App

## Option 1: Run from Command Prompt (Recommended)

1. **Open Command Prompt** (cmd.exe) or PowerShell

2. **Navigate to the project directory:**
   ```cmd
   cd "C:\Users\vivga\OneDrive\AI\AI Projects\Wisper"
   ```

3. **Start the development server:**
   ```cmd
   npm run dev
   ```
   
   This will start the server on **port 3001** (http://localhost:3001)

4. **Open your browser** and go to:
   ```
   http://localhost:3001
   ```

## Option 2: Use Port 3000 (if 3001 is busy)

```cmd
npm run dev:3000
```

Then open: http://localhost:3000

## Option 3: Custom Port

You can specify any port you want:

```cmd
npx next dev -p 8080
```

Then open: http://localhost:8080

## Troubleshooting

### Port Already in Use
If you get an error that the port is already in use:
- Try a different port (3002, 3003, etc.)
- Or stop the process using that port

### Check if Server is Running
You can check what's running on a port:
```cmd
netstat -ano | findstr :3001
```

### Stop the Server
Press `Ctrl + C` in the command prompt window where the server is running.

## Quick Start Commands

```cmd
# Navigate to project
cd "C:\Users\vivga\OneDrive\AI\AI Projects\Wisper"

# Install dependencies (if needed)
npm install

# Start server on port 3001
npm run dev

# Open browser to http://localhost:3001
```

