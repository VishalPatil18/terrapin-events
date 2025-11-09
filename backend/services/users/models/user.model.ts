import { BaseEntity, UserRole } from '../../../shared/types/common';

export interface User extends BaseEntity {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  emailVerified: boolean;
  cognitoId: string;
  preferences?: UserPreferences;
}

export interface UserPreferences {
  notifications: {
    email: boolean;
    inApp: boolean;
  };
  categories: string[];
}

export class UserModel {
  static toDynamoDBItem(user: Partial<User>): Record<string, any> {
    const timestamp = new Date().toISOString();
    
    return {
      PK: `USER#${user.userId}`,
      SK: 'METADATA',
      GSI1PK: `EMAIL#${user.email}`,
      GSI1SK: 'METADATA',
      userId: user.userId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role || UserRole.PARTICIPANT,
      emailVerified: user.emailVerified || false,
      cognitoId: user.cognitoId,
      preferences: user.preferences,
      createdAt: user.createdAt || timestamp,
      updatedAt: timestamp,
    };
  }

  static fromDynamoDBItem(item: Record<string, any>): User {
    return {
      PK: item.PK,
      SK: item.SK,
      GSI1PK: item.GSI1PK,
      GSI1SK: item.GSI1SK,
      userId: item.userId,
      email: item.email,
      firstName: item.firstName,
      lastName: item.lastName,
      role: item.role,
      emailVerified: item.emailVerified,
      cognitoId: item.cognitoId,
      preferences: item.preferences,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }
}
