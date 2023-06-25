import dateFormat from 'dateformat'
import { History } from 'history'
import update from 'immutability-helper'
import * as React from 'react'
import {
  Button,
  Checkbox,
  Divider,
  Grid,
  Header,
  Icon,
  Input,
  Image,
  Loader,
  Pagination,
  PaginationProps,
  StrictInputProps
} from 'semantic-ui-react'

import { createTodo, deleteTodo, getTodos, patchTodo } from '../api/todos-api'
import Auth from '../auth/Auth'
import { Todo } from '../types/Todo'

interface TodosProps {
  auth: Auth
  history: History
}

interface TodosState {
  todos: Todo[]
  newTodoName: string
  loadingTodos: boolean
  currentPage: number
  itemsPerPage: number
  pageKey: any
  lastKey: string
  totalPages: number
  totalItems: number
}

export class Todos extends React.PureComponent<TodosProps, TodosState> {
  state: TodosState = {
    todos: [],
    newTodoName: '',
    loadingTodos: true,
    currentPage: 1,
    itemsPerPage: 5,
    pageKey: {},
    lastKey: '',
    totalPages: 1,
    totalItems: 0
  }

  handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({ newTodoName: event.target.value })
  }

  handlePageChange = (
    event: React.MouseEvent<HTMLAnchorElement>,
    data: PaginationProps
  ) => {
    // Handle page change logic here
    const page = data.activePage as number
    const key = this.state.pageKey[page] ?? ''

    this.getPage(page, key)
  }

  onEditButtonClick = (todoId: string) => {
    this.props.history.push(`/todos/${todoId}/edit`)
  }

  onTodoCreate = async (event: React.ChangeEvent<HTMLButtonElement>) => {
    try {
      const dueDate = this.calculateDueDate()
      const newTodo = await createTodo(this.props.auth.getIdToken(), {
        name: this.state.newTodoName,
        dueDate
      })
      this.setState({
        todos: [...this.state.todos, newTodo],
        newTodoName: ''
      })
    } catch {
      alert('Todo creation failed')
    }
  }

  onTodoDelete = async (todoId: string) => {
    try {
      await deleteTodo(this.props.auth.getIdToken(), todoId)
      this.setState({
        todos: this.state.todos.filter(todo => todo.todoId !== todoId)
      })
    } catch {
      alert('Todo deletion failed')
    }
  }

  onTodoCheck = async (pos: number) => {
    try {
      const todo = this.state.todos[pos]
      await patchTodo(this.props.auth.getIdToken(), todo.todoId, {
        name: todo.name,
        dueDate: todo.dueDate,
        done: !todo.done
      })
      this.setState({
        todos: update(this.state.todos, {
          [pos]: { done: { $set: !todo.done } }
        })
      })
    } catch {
      alert('Todo deletion failed')
    }
  }

  getPage = async (page: number, key = '') => {
    const todos = await getTodos(this.props.auth.getIdToken(), key)
    const totalPages = Math.floor(todos.totalItems / todos.itemsLimit) + 1
    let { pageKey } = this.state
    pageKey[page + 1] = todos.lastKey

    this.setState({
      currentPage: page,
      todos: todos.items,
      pageKey: pageKey,
      totalPages: totalPages,
      totalItems: todos.totalItems,
      loadingTodos: false
    })
  }

  componentDidMount() {
    try {
      this.getPage(this.state.currentPage)
    } catch (e) {
      alert(`Failed to fetch todos: ${(e as Error).message}`)
    }
  }

  render() {
    return (
      <div className='pt-4 font-bold'>
        <Header as='h1' className='font-bold'>
          TODOs ({this.state.totalItems ?? 0})
        </Header>

        {this.renderCreateTodoInput()}

        {this.renderTodos()}

        <p className='font-bold'>
          Page {this.state.currentPage} of {this.state.totalPages}
        </p>
        {this.renderPagination()}
      </div>
    )
  }

  renderPagination() {
    return (
      <Grid.Row>
        <Pagination
          firstItem={null}
          lastItem={null}
          ellipsisItem={null}
          siblingRange={0}
          boundaryRange={0}
          onPageChange={this.handlePageChange}
          defaultActivePage={1}
          totalPages={this.state.totalPages}
        />
      </Grid.Row>
    )
  }

  renderCreateTodoInput() {
    return (
      <Grid.Row>
        <Grid.Column width={16}>
          <Input
            action={{
              color: 'teal',
              labelPosition: 'right',
              icon: 'add',
              content: 'Save task',
              onClick: this.onTodoCreate
            }}
            fluid
            placeholder='Add a new task...'
            value={this.state.newTodoName}
            onChange={this.handleNameChange}
          />
        </Grid.Column>
        <Grid.Column width={16}>
          <Divider />
        </Grid.Column>
      </Grid.Row>
    )
  }

  renderTodos() {
    if (this.state.loadingTodos) {
      return this.renderLoading()
    }

    return this.renderTodosList()
  }

  renderLoading() {
    return (
      <Grid.Row>
        <Loader indeterminate active inline='centered'>
          Loading TODOs
        </Loader>
      </Grid.Row>
    )
  }

  renderTodosList() {
    return (
      <div>
        {this.state.todos.map((todo, pos) => {
          return (
            <div className='w-full' key={todo.todoId}>
              <div className='flex w-full'>
                <div className='flex items-center flex-shrink w-auto'>
                  <Checkbox
                    className='mt-1'
                    toggle
                    onChange={() => this.onTodoCheck(pos)}
                    checked={todo.done}
                  />
                </div>
                <div className='flex-auto flex items-center text-left px-8'>
                  {todo.attachmentUrl && (
                    <Image src={todo.attachmentUrl} size='small' wrapped />
                  )}
                  {todo.name}
                </div>
                <div className='flex items-center flex-shrink w-auto px-8'>
                  {todo.dueDate}
                </div>
                <div className='flex items-center flex-shrink w-auto'>
                  <Button
                    icon
                    color='blue'
                    onClick={() => this.onEditButtonClick(todo.todoId)}
                  >
                    <Icon name='pencil' />
                  </Button>
                  <Button
                    icon
                    color='red'
                    onClick={() => this.onTodoDelete(todo.todoId)}
                  >
                    <Icon name='delete' />
                  </Button>
                </div>
              </div>
              <Divider />
            </div>
          )
        })}
      </div>
    )
  }

  calculateDueDate(): string {
    const date = new Date()
    date.setDate(date.getDate() + 7)

    return dateFormat(date, 'yyyy-mm-dd') as string
  }
}
