import { APIGatewayProxyResult } from 'aws-lambda';

export const buildResponse = (
  statusCode: number,
  body: any,
  headers: Record<string, string> = {}
): APIGatewayProxyResult => {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
      ...headers
    },
    body: JSON.stringify(body)
  };
};

export const successResponse = (data: any) => buildResponse(200, { success: true, data });
export const errorResponse = (message: string, statusCode: number = 500) => 
  buildResponse(statusCode, { success: false, error: message });
