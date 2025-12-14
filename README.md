# This is a Demo for triage
# Backend API Server

Backend API server for Aziro Cluster Center - Enterprise virtual machine orchestration and cluster management platform.

## Project Structure

```
backend/
├── src/
│   ├── server.js              # Main server entry point
│   ├── config/
│   │   └── database.js        # MongoDB connection configuration
│   ├── controllers/
│   │   ├── vmController.js    # VM management controller
│   │   └── monitoringController.js  # System monitoring controller
│   ├── models/
│   │   ├── VM.js              # VM data model
│   │   ├── VMSnapshot.js      # Snapshot model
│   │   ├── VMMetrics.js       # VM metrics model
│   │   ├── Log.js             # Log model
│   │   ├── PerformanceMetrics.js  # Performance metrics
│   │   ├── SystemAlert.js     # System alerts
│   │   └── AutomationLog.js   # Automation logs
│   ├── routes/
│   │   ├── vmRoutes.js        # VM API routes
│   │   ├── monitoringRoutes.js # Monitoring routes
│   │   └── logRoutes.js       # Log routes
│   ├── services/
│   │   ├── vmService.js       # VM business logic
│   │   └── monitoringService.js  # Monitoring service
│   └── logging/
│       └── logger.js          # Winston logger configuration
├── package.json
└── logs/                      # Application logs
```

## How to Run

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (running locally or remote)

### Installation

```bash
cd backend
npm install
```

### Configuration

Create a `.env` file (if not exists):

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/aziro-cluster
NODE_ENV=development
```

### Start Server

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

## Access Points

- **API Base URL**: `http://localhost:5000/api`
- **Health Check**: `http://localhost:5000/api/health`
- **VM Management**: `http://localhost:5000/api/vms`
- **Monitoring**: `http://localhost:5000/api/monitoring`
- **Logs**: `http://localhost:5000/api/logs`

## Port

**Port: 5000**

The server runs on port 5000 by default. You can override this by setting the `PORT` environment variable.

## API Endpoints

- `GET /api/health` - Health check
- `GET /api/vms` - Get all VMs
- `POST /api/vms` - Create VM
- `PUT /api/vms/:id` - Update VM
- `DELETE /api/vms/:id` - Delete VM
- `POST /api/vms/:id/start` - Start VM
- `POST /api/vms/:id/stop` - Stop VM
- `POST /api/vms/:id/snapshot` - Create snapshot
- `GET /api/monitoring/metrics` - Get system metrics
- `GET /api/logs` - Get logs

