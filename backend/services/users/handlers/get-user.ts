import { APIGatewayProxyHandler } from 'aws-lambda';
import { db } from '../../../shared/utils/dynamodb';
import { logger } from '../../../shared/utils/logger';
import { successResponse, errorResponse } from '../../../shared/utils/response';
import { UserModel } from '../models/user.model';

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const userId = event.pathParameters?.userId;
    
    if (!userId) {
      return errorResponse('User ID is required', 400);
    }

    logger.info('Fetching user', { userId });

    const item = await db.get(`USER#${userId}`, 'METADATA');

    if (!item) {
      return errorResponse('User not found', 404);
    }

    const user = UserModel.fromDynamoDBItem(item);

    return successResponse(user);
  } catch (error) {
    logger.error('Error fetching user', error);
    return errorResponse('Internal server error', 500);
  }
};
