import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { 
  DynamoDBDocumentClient, 
  GetCommand, 
  PutCommand, 
  QueryCommand, 
  UpdateCommand,
  DeleteCommand,
  BatchWriteCommand
} from '@aws-sdk/lib-dynamodb';
import { logger } from './logger';

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1'
});

const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
    convertClassInstanceToMap: true
  }
});

const TABLE_NAME = process.env.TABLE_NAME || 'terrapin-events-dynamodb-dev';

export class DynamoDBService {
  async get(pk: string, sk: string) {
    try {
      const result = await docClient.send(new GetCommand({
        TableName: TABLE_NAME,
        Key: { PK: pk, SK: sk }
      }));
      return result.Item;
    } catch (error) {
      logger.error('DynamoDB get error', error, { pk, sk });
      throw error;
    }
  }

  async put(item: Record<string, any>) {
    try {
      await docClient.send(new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          ...item,
          createdAt: item.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      }));
      return item;
    } catch (error) {
      logger.error('DynamoDB put error', error, { item });
      throw error;
    }
  }

  async query(params: {
    pk: string;
    sk?: { begins_with?: string; equals?: string; between?: [string, string] };
    indexName?: string;
    limit?: number;
    scanIndexForward?: boolean;
  }) {
    try {
      const keyCondition = params.sk
        ? `PK = :pk AND ${this.buildSKCondition(params.sk)}`
        : 'PK = :pk';
        
      const expressionAttributeValues: Record<string, any> = { ':pk': params.pk };
      
      if (params.sk?.equals) expressionAttributeValues[':sk'] = params.sk.equals;
      if (params.sk?.begins_with) expressionAttributeValues[':sk'] = params.sk.begins_with;
      if (params.sk?.between) {
        expressionAttributeValues[':sk1'] = params.sk.between[0];
        expressionAttributeValues[':sk2'] = params.sk.between[1];
      }

      const result = await docClient.send(new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: params.indexName,
        KeyConditionExpression: keyCondition,
        ExpressionAttributeValues: expressionAttributeValues,
        Limit: params.limit,
        ScanIndexForward: params.scanIndexForward ?? true
      }));
      
      return result.Items || [];
    } catch (error) {
      logger.error('DynamoDB query error', error, params);
      throw error;
    }
  }

  private buildSKCondition(sk: any): string {
    if (sk.equals) return 'SK = :sk';
    if (sk.begins_with) return 'begins_with(SK, :sk)';
    if (sk.between) return 'SK BETWEEN :sk1 AND :sk2';
    return 'SK = :sk';
  }

  async update(pk: string, sk: string, updates: Record<string, any>) {
    try {
      const updateExpression = Object.keys(updates)
        .map(key => `#${key} = :${key}`)
        .join(', ');
        
      const expressionAttributeNames = Object.keys(updates).reduce((acc, key) => {
        acc[`#${key}`] = key;
        return acc;
      }, {} as Record<string, string>);
      
      const expressionAttributeValues = Object.keys(updates).reduce((acc, key) => {
        acc[`:${key}`] = updates[key];
        return acc;
      }, {} as Record<string, any>);

      expressionAttributeNames['#updatedAt'] = 'updatedAt';
      expressionAttributeValues[':updatedAt'] = new Date().toISOString();

      const result = await docClient.send(new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { PK: pk, SK: sk },
        UpdateExpression: `SET ${updateExpression}, #updatedAt = :updatedAt`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW'
      }));
      
      return result.Attributes;
    } catch (error) {
      logger.error('DynamoDB update error', error, { pk, sk, updates });
      throw error;
    }
  }

  async delete(pk: string, sk: string) {
    try {
      await docClient.send(new DeleteCommand({
        TableName: TABLE_NAME,
        Key: { PK: pk, SK: sk }
      }));
    } catch (error) {
      logger.error('DynamoDB delete error', error, { pk, sk });
      throw error;
    }
  }
}

export const db = new DynamoDBService();
