const mongoose = require('mongoose');
const { Logger, LogCategory } = require('../logging/logger');

class DatabaseConnection {
  constructor() {
    this.isConnected = false;
  }

  async connect() {
    try {
      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/aziro_cluster_center';
      
      Logger.logL3Info('Attempting to connect to MongoDB', {
        category: LogCategory.DATABASE,
        operation: 'database_connect',
        uri: mongoUri.replace(/\/\/.*@/, '//***:***@') // Hide credentials in logs
      });

      await mongoose.connect(mongoUri, {
        maxPoolSize: 10, // Maintain up to 10 socket connections
        serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
        socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
        bufferCommands: false // Disable mongoose buffering
      });

      this.isConnected = true;

      Logger.logL3Info('Successfully connected to MongoDB', {
        category: LogCategory.DATABASE,
        operation: 'database_connected',
        database: mongoose.connection.db.databaseName
      });

      // Connection event handlers
      mongoose.connection.on('error', (error) => {
        Logger.logL1Critical('MongoDB connection error', {
          category: LogCategory.DATABASE,
          operation: 'database_error',
          error: error.message
        });
      });

      mongoose.connection.on('disconnected', () => {
        this.isConnected = false;
        Logger.logL2Warning('MongoDB disconnected', {
          category: LogCategory.DATABASE,
          operation: 'database_disconnected'
        });
      });

      mongoose.connection.on('reconnected', () => {
        this.isConnected = true;
        Logger.logL3Info('MongoDB reconnected', {
          category: LogCategory.DATABASE,
          operation: 'database_reconnected'
        });
      });

      return mongoose.connection;

    } catch (error) {
      Logger.logL1Critical('Failed to connect to MongoDB', {
        category: LogCategory.DATABASE,
        operation: 'database_connect_failed',
        error: error.message
      });
      throw error;
    }
  }

  async disconnect() {
    try {
      if (this.isConnected) {
        await mongoose.disconnect();
        this.isConnected = false;
        
        Logger.logL3Info('Disconnected from MongoDB', {
          category: LogCategory.DATABASE,
          operation: 'database_disconnect'
        });
      }
    } catch (error) {
      Logger.logL1Critical('Error disconnecting from MongoDB', {
        category: LogCategory.DATABASE,
        operation: 'database_disconnect_error',
        error: error.message
      });
      throw error;
    }
  }

  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      readyState: mongoose.connection.readyState,
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      name: mongoose.connection.name
    };
  }

  async initializeData() {
    try {
      Logger.logL3Info('Database initialized - no sample data created', {
        category: LogCategory.DATABASE,
        operation: 'data_initialization'
      });
      
      // Database is ready - no sample data will be created
      // Users will create their own VMs through the UI
      
    } catch (error) {
      Logger.logL1Critical('Failed to initialize database', {
        category: LogCategory.DATABASE,
        operation: 'data_initialization_failed',
        error: error.message
      });
      throw error;
    }
  }
}

// Create singleton instance
const dbConnection = new DatabaseConnection();

module.exports = dbConnection;