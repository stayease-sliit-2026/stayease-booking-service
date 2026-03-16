const authMiddleware = require('./auth');
const axios = require('axios');

jest.mock('axios');

describe('Auth Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      headers: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
  });

  it('should call next if token is valid', async () => {
    req.headers.authorization = 'Bearer valid-token';

    const mockUser = {
      id: 'user123',
      email: 'user@example.com',
    };

    axios.get.mockResolvedValue({ data: { user: mockUser } });

    await authMiddleware(req, res, next);

    expect(req.user).toEqual(mockUser);
    expect(req.token).toBe('valid-token');
    expect(next).toHaveBeenCalled();
  });

  it('should return 401 if no authorization header', async () => {
    await authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: true,
        message: expect.stringContaining('authorization'),
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 if token is invalid', async () => {
    req.headers.authorization = 'Bearer invalid-token';

    axios.get.mockRejectedValue({
      response: { status: 401 },
      message: 'Invalid token',
    });

    await authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 503 if auth service is unavailable', async () => {
    req.headers.authorization = 'Bearer valid-token';

    axios.get.mockRejectedValue({
      code: 'ECONNREFUSED',
      message: 'Connection refused',
    });

    await authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: true,
        message: 'Auth service unavailable',
      })
    );
  });

  it('should handle Bearer token without space', async () => {
    req.headers.authorization = 'BearerToken'; // Missing space

    await authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
  });
});
