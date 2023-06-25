import * as AWS from 'aws-sdk'
import * as AWSXRay from 'aws-xray-sdk'
import { DocumentClient } from 'aws-sdk/clients/dynamodb'
import { TodoItem } from '../models/TodoItem'
import { TodoUpdate } from '../models/TodoUpdate'

const XAWS = AWSXRay.captureAWS(AWS)

const QUERY_LIMIT = 20

export class TodoAccess {
  private readonly docClient: DocumentClient
  private readonly todosTable: string

  constructor() {
    this.docClient = createDynamoDBClient()
    this.todosTable = process.env.TODOS_TABLE
  }

  async getAllTodos(
    userId: string,
    lastKey: string,
    limit: number
  ): Promise<any> {
    let lastEvaluatedKey = null
    if (lastKey) {
      lastEvaluatedKey = {
        todoId: lastKey,
        userId: userId
      }
    }
    limit = limit && limit < QUERY_LIMIT && limit > 0 ? limit : QUERY_LIMIT
    const params = {
      TableName: this.todosTable,
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId
      },
      ProjectionExpression:
        'todoId, createdAt, #name, dueDate, done, attachmentUrl',
      ExpressionAttributeNames: {
        '#name': 'name'
      },
      Limit: limit, // Set the desired number of items per page
      ExclusiveStartKey: lastEvaluatedKey
    }
    const result = await this.docClient.query(params).promise()
    const lastKeyTodoId = result.LastEvaluatedKey?.todoId ?? null
    const totalItems = await this.getTodoCount(userId)

    return {
      items: result.Items as TodoItem[],
      lastKey: lastKeyTodoId,
      itemsLimit: limit,
      totalItems: totalItems
    }
  }

  async getTodoCount(userId: string): Promise<number> {
    const params = {
      TableName: this.todosTable,
      Select: 'COUNT',
      FilterExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId
      }
    }

    const response = await this.docClient.scan(params).promise()
    return response.Count ?? 0
  }

  async createTodo(todoItem: TodoItem): Promise<TodoItem> {
    await this.docClient
      .put({
        TableName: this.todosTable,
        Item: todoItem
      })
      .promise()

    return todoItem
  }

  async updateTodo(todoId: string, userId: string, todoUpdate: TodoUpdate) {
    const key = {
      userId,
      todoId
    }
    const params = {
      TableName: this.todosTable,
      Key: key,
      UpdateExpression: 'set #attr1 = :val1, #attr2 = :val2, #attr3 = :val3',
      ExpressionAttributeNames: {
        '#attr1': 'name',
        '#attr2': 'dueDate',
        '#attr3': 'done'
      },
      ExpressionAttributeValues: {
        ':val1': todoUpdate.name,
        ':val2': todoUpdate.dueDate,
        ':val3': todoUpdate.done
      }
    }
    await this.docClient.update(params).promise()
  }

  async updateTodoAttachmentUrl(
    todoId: string,
    userId: string,
    attachmentUrl: string
  ) {
    const key = {
      userId,
      todoId
    }
    const params = {
      TableName: this.todosTable,
      Key: key,
      UpdateExpression: 'set #attr1 = :val1',
      ExpressionAttributeNames: {
        '#attr1': 'attachmentUrl'
      },
      ExpressionAttributeValues: {
        ':val1': attachmentUrl
      }
    }
    await this.docClient.update(params).promise()
  }

  async deleteTodo(todoId: string, userId: string): Promise<string> {
    const key = {
      userId,
      todoId
    }
    const params = {
      TableName: this.todosTable,
      Key: key,
      ConditionExpression:
        'attribute_exists(userId) AND attribute_exists(todoId)'
    }

    await this.docClient.delete(params).promise()
    return todoId
  }
}

function createDynamoDBClient() {
  return new XAWS.DynamoDB.DocumentClient()
}
