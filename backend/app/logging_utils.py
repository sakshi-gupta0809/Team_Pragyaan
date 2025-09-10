import logging
import time
from fastapi import Request

# Configure logger
logger = logging.getLogger(__name__)

# Utility function to add custom context to request logs
def add_log_context(request: Request, **kwargs):
    """
    Add custom context data to be included in request logs.
    
    Example usage in route handlers:
        @router.get("/example")
        async def example_route(request: Request):
            add_log_context(request, user_id=123, action="view_profile")
            # Rest of the function...
    """
    if not hasattr(request.state, "log_context"):
        request.state.log_context = {}
    
    # Add unique request ID if not already present
    if not hasattr(request.state, "request_id"):
        request.state.request_id = f"{int(time.time())}-{id(request)}"
    
    # Update context with provided kwargs
    request.state.log_context.update(kwargs)

# Request logging middleware
async def log_requests(request: Request, call_next):
    start_time = time.time()
    
    # Extract request details
    client_host = request.client.host if request.client else "unknown"
    query_params = str(request.query_params) if request.query_params else ""
    
    # Get custom log context if available
    request_id = getattr(request.state, "request_id", "-")
    custom_context = getattr(request.state, "log_context", {})
    context_str = " ".join([f"{k}={v}" for k, v in custom_context.items()]) if custom_context else ""
    
    # Log detailed request info
    logger.info(
        f"Request: {request.method} {request.url.path} {query_params} - "
        f"Client: {client_host} - ID: {request_id} {context_str}"
    )
    
    # Process the request
    response = await call_next(request)
    
    # Calculate and log processing time
    process_time = time.time() - start_time
    logger.info(
        f"Response: {request.method} {request.url.path} - "
        f"Status: {response.status_code} - Time: {process_time:.4f}s - ID: {request_id}"
    )
    
    return response