import { Navigate, Route, Routes } from 'react-router'
import AuthHeader from './components/AuthHeader'
import Toasts from './components/Toasts'
import RequireLogin from './components/RequireLogin'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import PendingPage from './pages/PendingPage'
import GamePage from './pages/GamePage'

// The Vue router, as JSX. `RequireLogin` is the "navigation guard": it also starts the live updates.
export default function App() {
    return (
        <main className="app">
            <AuthHeader />
            <h1>UNO</h1>
            <Toasts />
            <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route element={<RequireLogin />}>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/pending/:id" element={<PendingPage />} />
                    <Route path="/game/:id" element={<GamePage />} />
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </main>
    )
}
