import 'source-map-support/register'

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import * as middy from 'middy'
import { cors, httpErrorHandler } from 'middy/middlewares'

import { updateTodo } from '../../businessLayer/todos'
import { UpdateTodoRequest } from '../../requests/UpdateTodoRequest'
import { extractUserIdFromAuthHeader } from '../../auth/utils'

export const handler = middy(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    // Request parsing
    const todoId = event.pathParameters.todoId
    const updatedTodo: UpdateTodoRequest = JSON.parse(event.body)

    // Auth header parsing
    const userId = extractUserIdFromAuthHeader(event.headers.Authorization)

    await updateTodo(todoId, userId, updatedTodo)

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Todo updated' })
    }
  }
)

handler.use(httpErrorHandler()).use(
  cors({
    credentials: true
  })
)
