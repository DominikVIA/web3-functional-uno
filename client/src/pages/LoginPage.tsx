import { useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { useAppDispatch } from '../hooks'
import LoginThunk from '../thunks/LoginThunk'
import RegisterThunk from '../thunks/RegisterThunk'

// Login and Register were two pages that only differed by the store call, so it is one form
// with two buttons. The server has no passwords yet: a name is all it asks for.
export default function LoginPage() {
  const [name, set_name] = useState('')
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const [query] = useSearchParams()

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (name.trim() !== '') dispatch(LoginThunk(name.trim(), query, navigate))
  }

  const register = () => {
    if (name.trim() !== '') dispatch(RegisterThunk(name.trim(), query, navigate))
  }

  return (
      <section className="panel">
        <h2>Login to UNO</h2>
        <form onSubmit={submit}>
          <div className="field">
            <input value={name} onChange={event => set_name(event.target.value)} placeholder="Username" required />
          </div>
          <button type="submit">Login</button>{' '}
          <button type="button" onClick={register}>Register</button>
        </form>
      </section>
  )
}
