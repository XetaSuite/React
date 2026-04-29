import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { FaEye, FaEyeSlash } from "react-icons/fa6";
import { useAuth } from '../hooks';
import { useAppConfig } from '@/shared/store';
import { safeRedirectPath } from '@/shared/utils';
import Label from "@/shared/components/form/Label";
import Input from "@/shared/components/form/input/InputField";
import Checkbox from "@/shared/components/form/input/Checkbox";
import Button from "@/shared/components/ui/button/Button";
import Alert from '@/shared/components/ui/alert/Alert';

// Demo credentials
const DEMO_EMAIL = 'admin@xetasuite.demo';
const DEMO_PASSWORD = 'password';

export default function SignInForm() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useAuth();
    const { isDemoMode } = useAppConfig();

    const [email, setEmail] = useState(isDemoMode ? DEMO_EMAIL : '');
    const [password, setPassword] = useState(isDemoMode ? DEMO_PASSWORD : '');
    const [showPassword, setShowPassword] = useState(false);
    const [remember, setRemember] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const successMessage = (location.state as { message?: string })?.message;

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            await login({ email, password, remember });
            const from = location.state as { from?: { pathname: string; search?: string } } | null;
            const candidate = from?.from ? `${from.from.pathname}${from.from.search || ''}` : '/';
            const redirectTo = safeRedirectPath(candidate, '/');
            navigate(redirectTo, { replace: true });
        } catch (err) {
            setError(err instanceof Error ? err.message : t('errors.generic'));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
                {t('auth.signInToAccount')}
            </h2>

            {successMessage && (
                <Alert variant="success" className="mb-4" message={successMessage} />
            )}

            {error && (
                <Alert variant="error" className="mb-4" message={error} />
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                    <Label>
                        {t('auth.email')} <span className="text-error-500">*</span>{" "}
                    </Label>
                    <Input
                        type="email"
                        name="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={t('auth.emailPlaceholder')}
                        required
                        autoComplete="email"
                        autoFocus
                    />
                </div>

                <div>
                    <Label>
                        {t('auth.password')} <span className="text-error-500">*</span>{" "}
                    </Label>
                    <div className="relative">
                        <Input
                            type={showPassword ? "text" : "password"}
                            name="password"
                            placeholder={t('auth.passwordPlaceholder')}
                            required
                            autoComplete="current-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        <span
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
                        >
                            {showPassword ? (
                                <FaEye className="fill-gray-500 dark:fill-gray-400 size-5" />
                            ) : (
                                <FaEyeSlash className="fill-gray-500 dark:fill-gray-400 size-5" />
                            )}
                        </span>
                    </div>
                </div>

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Checkbox checked={remember} onChange={setRemember} />
                        <span className="block font-normal text-gray-700 text-sm dark:text-gray-400">
                            {t('auth.rememberMe')}
                        </span>
                    </div>

                    <Link
                        to="/forgot-password"
                        className="text-sm font-medium text-brand-600 hover:text-brand-500"
                    >
                        {t('auth.forgotPassword')}
                    </Link>
                </div>

                <Button
                    type="submit"
                    fullWidth
                    isLoading={isLoading}
                    disabled={isLoading}
                >
                    {isLoading ? t('auth.signingIn') : t('auth.loginButton')}
                </Button>
            </form>

            <div className="mt-4 text-center">
                <Link
                    to="/setup-password-resend"
                    className="text-sm font-medium text-brand-600 hover:text-brand-500"
                >
                    {t('auth.passwordNotSetup')}
                </Link>
            </div>
        </div>
    );
}
