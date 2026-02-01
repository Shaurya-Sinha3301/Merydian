# 🌐 Website Integration Guide

**Version**: 1.0  
**Date**: January 31, 2026

---

## Overview

This guide shows how to integrate the Voyageur Agent System into your web application. The agent system is designed to be consumed via REST API or WebSocket connections.

---

## Integration Patterns

### Pattern 1: REST API (Recommended for MVP)

Simple, stateless HTTP endpoints for processing user feedback.

#### FastAPI Implementation

```python
# api/main.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any, List

import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent))

from agents.agent_controller import AgentController

app = FastAPI(title="Voyageur Agent API", version="1.0")

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize controller (singleton)
controller = AgentController()


class FeedbackRequest(BaseModel):
    text: str
    context: Optional[Dict[str, Any]] = None


class FeedbackResponse(BaseModel):
    event_type: str
    action: str
    reason: str
    explanations: List[str]
    optimizer_ran: bool


@app.post("/api/v1/feedback", response_model=FeedbackResponse)
async def process_feedback(request: FeedbackRequest):
    """
    Process user feedback through the agent pipeline.
    
    Request body:
    {
        "text": "We loved Akshardham, we definitely want to visit it tomorrow.",
        "context": {
            "family_id": "FAM_B",
            "current_day": 1
        }
    }
    """
    try:
        result = controller.process_user_input(
            user_input=request.text,
            context=request.context
        )
        
        return FeedbackResponse(
            event_type=result['event'].event_type,
            action=result['decision'].action,
            reason=result['decision'].reason,
            explanations=[exp.summary for exp in result['explanations']],
            optimizer_ran=result['optimizer_output'] is not None
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "voyageur-agents"}


# Run with: uvicorn api.main:app --reload
```

#### Frontend Integration (React Example)

```javascript
// src/services/agentService.js
export async function submitFeedback(text, context = {}) {
  const response = await fetch('http://localhost:8000/api/v1/feedback', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text, context }),
  });
  
  if (!response.ok) {
    throw new Error('Failed to process feedback');
  }
  
  return await response.json();
}

// src/components/FeedbackForm.jsx
import { useState } from 'react';
import { submitFeedback } from '../services/agentService';

export default function FeedbackForm({ familyId, currentDay }) {
  const [feedback, setFeedback] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await submitFeedback(feedback, {
        family_id: familyId,
        current_day: currentDay,
      });
      
      setResult(response);
      console.log('Agent result:', response);
      
      // Display explanations to user
      if (response.explanations.length > 0) {
        alert(response.explanations.join('\n\n'));
      }
      
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to process feedback');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <textarea
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        placeholder="Share your feedback..."
        rows={4}
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Processing...' : 'Submit Feedback'}
      </button>
      
      {result && (
        <div className="result">
          <p><strong>Detected:</strong> {result.event_type}</p>
          <p><strong>Action:</strong> {result.action}</p>
          {result.optimizer_ran && <p>✓ Itinerary updated!</p>}
        </div>
      )}
    </form>
  );
}
```

---

### Pattern 2: WebSocket (Real-Time Updates)

For live feedback during optimization (shows progress to user).

#### Socket.IO Server

```python
# api/websocket_server.py
from socketio import AsyncServer, ASGIApp
from fastapi import FastAPI
import asyncio

import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent))

from agents.agent_controller import AgentController

app = FastAPI()
sio = AsyncServer(async_mode='asgi', cors_allowed_origins='*')
socket_app = ASGIApp(sio, app)

controller = AgentController()


@sio.on('connect')
async def connect(sid, environ):
    print(f'Client connected: {sid}')
    await sio.emit('connection_established', {'sid': sid}, room=sid)


@sio.on('disconnect')
def disconnect(sid):
    print(f'Client disconnected: {sid}')


@sio.on('user_feedback')
async def handle_feedback(sid, data):
    """
    Handle user feedback with real-time progress updates.
    
    Expected data: {
        "text": "...",
        "context": {...}
    }
    """
    try:
        # Emit: Parsing started
        await sio.emit('stage', {
            'stage': 'parsing',
            'message': 'Analyzing your feedback...'
        }, room=sid)
        
        # Process through pipeline (in future, make this async)
        result = controller.process_user_input(
            user_input=data['text'],
            context=data.get('context')
        )
        
        # Emit: Event parsed
        await sio.emit('event_parsed', {
            'event_type': result['event'].event_type,
            'confidence': result['event'].confidence
        }, room=sid)
        
        await asyncio.sleep(0.5)  # Simulate thinking
        
        # Emit: Decision made
        await sio.emit('decision_made', {
            'action': result['decision'].action,
            'reason': result['decision'].reason
        }, room=sid)
        
        # Emit: Optimizer status
        if result['optimizer_output']:
            await sio.emit('stage', {
                'stage': 'optimizing',
                'message': 'Recalculating itinerary...'
            }, room=sid)
            
            await asyncio.sleep(1.5)  # Simulate optimization
            
            await sio.emit('optimizer_complete', {
                'success': True
            }, room=sid)
        
        # Emit: Explanations
        if result['explanations']:
            await sio.emit('explanations', {
                'summaries': [exp.summary for exp in result['explanations']]
            }, room=sid)
        
        # Final completion
        await sio.emit('processing_complete', {
            'success': True
        }, room=sid)
        
    except Exception as e:
        await sio.emit('error', {
            'message': str(e)
        }, room=sid)


# Run with: uvicorn api.websocket_server:socket_app --reload
```

#### Frontend WebSocket Client

```javascript
// src/services/socketService.js
import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = {};
  }

  connect() {
    this.socket = io('http://localhost:8000', {
      transports: ['websocket'],
    });

    this.socket.on('connection_established', (data) => {
      console.log('Connected with session:', data.sid);
    });

    this.socket.on('stage', (data) => {
      this.emit('stage', data);
    });

    this.socket.on('event_parsed', (data) => {
      this.emit('event_parsed', data);
    });

    this.socket.on('decision_made', (data) => {
      this.emit('decision_made', data);
    });

    this.socket.on('optimizer_complete', (data) => {
      this.emit('optimizer_complete', data);
    });

    this.socket.on('explanations', (data) => {
      this.emit('explanations', data);
    });

    this.socket.on('processing_complete', (data) => {
      this.emit('processing_complete', data);
    });

    this.socket.on('error', (data) => {
      this.emit('error', data);
    });
  }

  sendFeedback(text, context) {
    this.socket.emit('user_feedback', { text, context });
  }

  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  emit(event, data) {
    const listeners = this.listeners[event] || [];
    listeners.forEach(callback => callback(data));
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}

export const socketService = new SocketService();
```

---

## Authentication & Rate Limiting

### JWT Authentication

```python
# api/auth.py
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt

security = HTTPBearer()

SECRET_KEY = "your-secret-key"  # Use environment variable

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(
            credentials.credentials,
            SECRET_KEY,
            algorithms=["HS256"]
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired"
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )


# Protected endpoint
@app.post("/api/v1/feedback")
async def process_feedback(
    request: FeedbackRequest,
    user=Depends(verify_token)
):
    # user["user_id"] available here
    ...
```

### Rate Limiting

```python
# api/middleware.py
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@app.post("/api/v1/feedback")
@limiter.limit("10/minute")  # 10 requests per minute
async def process_feedback(request: Request, feedback: FeedbackRequest):
    ...
```

---

## Deployment

### Docker Deployment

```dockerfile
# Dockerfile
FROM python:3.10-slim

WORKDIR /app

# Copy requirements
COPY requirements_agents.txt .
RUN pip install --no-cache-dir -r requirements_agents.txt
RUN pip install fastapi uvicorn python-multipart

# Copy code
COPY agents/ ./agents/
COPY ml_or/ ./ml_or/
COPY api/ ./api/
COPY .env .env

# Expose port
EXPOSE 8000

# Run API
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  voyageur-api:
    build: .
    ports:
      - "8000:8000"
    environment:
      - GROQ_API_KEY=${GROQ_API_KEY}
      - LOG_LEVEL=INFO
    volumes:
      - ./agents:/app/agents
      - ./ml_or:/app/ml_or
    restart: unless-stopped
```

### Environment Variables

```bash
# .env.production
GROQ_API_KEY=your_production_key
GROQ_MODEL=llama-3.1-8b-instant
LOG_LEVEL=WARNING
SECRET_KEY=your_jwt_secret
DATABASE_URL=postgresql://...
```

---

## Monitoring & Logging

### Structured Logging

```python
# api/logging_config.py
import logging
import json
from datetime import datetime

class JSONFormatter(logging.Formatter):
    def format(self, record):
        log_data = {
            'timestamp': datetime.utcnow().isoformat(),
            'level': record.levelname,
            'message': record.getMessage(),
            'module': record.module,
            'function': record.funcName,
        }
        
        if hasattr(record, 'user_id'):
            log_data['user_id'] = record.user_id
        
        return json.dumps(log_data)

# Configure
handler = logging.StreamHandler()
handler.setFormatter(JSONFormatter())
logging.root.addHandler(handler)
logging.root.setLevel(logging.INFO)
```

### Metrics Tracking

```python
# api/metrics.py
from prometheus_client import Counter, Histogram
import time

feedback_requests = Counter(
    'feedback_requests_total',
    'Total feedback requests',
    ['event_type', 'action']
)

processing_duration = Histogram(
    'feedback_processing_seconds',
    'Time spent processing feedback'
)

@app.post("/api/v1/feedback")
async def process_feedback(request: FeedbackRequest):
    start_time = time.time()
    
    result = controller.process_user_input(...)
    
    # Track metrics
    feedback_requests.labels(
        event_type=result['event'].event_type,
        action=result['decision'].action
    ).inc()
    
    processing_duration.observe(time.time() - start_time)
    
    return ...
```

---

## Testing

### API Testing

```python
# tests/test_api.py
from fastapi.testclient import TestClient
from api.main import app

client = TestClient(app)

def test_feedback_endpoint():
    response = client.post("/api/v1/feedback", json={
        "text": "We loved Akshardham",
        "context": {"family_id": "FAM_B"}
    })
    
    assert response.status_code == 200
    data = response.json()
    assert data["event_type"] == "MUST_VISIT_ADDED"
    assert data["action"] in ["RUN_OPTIMIZER", "UPDATE_PREFERENCES_ONLY"]
```

---

## Next Steps

1. Choose integration pattern (REST or WebSocket)
2. Implement authentication
3. Add rate limiting
4. Set up monitoring
5. Deploy to staging
6. Load test
7. Deploy to production

See [QUICK_START_GUIDE.md](QUICK_START_GUIDE.md) for local development setup.
