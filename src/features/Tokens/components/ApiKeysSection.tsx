import { type FC, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { Button, Modal } from '@/shared/components/ui';
import { TokenManager } from '../services/TokenManager';
import type { PersonalAccessToken } from '../types';

const ApiKeysSection: FC = () => {
    const { t } = useTranslation();
    const [tokens, setTokens] = useState<PersonalAccessToken[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newTokenName, setNewTokenName] = useState('');
    const [newTokenExpiry, setNewTokenExpiry] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [plainTextToken, setPlainTextToken] = useState<string | null>(null);
    const [revoking, setRevoking] = useState<number | null>(null);

    const loadTokens = async () => {
        setIsLoading(true);
        const result = await TokenManager.getAll();
        if (result.success) {
            setTokens(result.data);
        } else {
            toast.error(result.error);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        loadTokens();
    }, []);

    const handleCreate = async () => {
        if (!newTokenName.trim()) return;
        setIsCreating(true);
        const result = await TokenManager.create({
            name: newTokenName.trim(),
            expires_at: newTokenExpiry || null,
        });
        if (result.success) {
            setPlainTextToken(result.data.plain_text_token);
            setIsCreateOpen(false);
            setNewTokenName('');
            setNewTokenExpiry('');
            await loadTokens();
            toast.success(t('account.tokens.createSuccess'));
        } else {
            toast.error(result.error);
        }
        setIsCreating(false);
    };

    const handleRevoke = async (id: number) => {
        setRevoking(id);
        const result = await TokenManager.revoke(id);
        if (result.success) {
            setTokens((prev) => prev.filter((t) => t.id !== id));
            toast.success(t('account.tokens.revokeSuccess'));
        } else {
            toast.error(result.error);
        }
        setRevoking(null);
    };

    return (
        <div>
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('account.tokens.title')}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        {t('account.tokens.description')}
                    </p>
                </div>
                <Button onClick={() => setIsCreateOpen(true)}>{t('account.tokens.create')}</Button>
            </div>

            {isLoading ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('account.tokens.loading')}</p>
            ) : tokens.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('account.tokens.empty')}</p>
            ) : (
                <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                    {tokens.map((token) => (
                        <li key={token.id} className="flex items-center justify-between py-3">
                            <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">{token.name}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {t('account.tokens.createdAt', { date: new Date(token.created_at).toLocaleDateString('fr-FR') })}
                                    {token.expires_at && (
                                        <> · {t('account.tokens.expiresAt', { date: new Date(token.expires_at).toLocaleDateString('fr-FR') })}</>
                                    )}
                                    {token.last_used_at && (
                                        <> · {t('account.tokens.lastUsedAt', { date: new Date(token.last_used_at).toLocaleDateString('fr-FR') })}</>
                                    )}
                                </p>
                            </div>
                            <Button
                                variant="danger"
                                size="sm"
                                isLoading={revoking === token.id}
                                onClick={() => handleRevoke(token.id)}
                            >
                                {t('account.tokens.revoke')}
                            </Button>
                        </li>
                    ))}
                </ul>
            )}

            {/* Plain text token display (one-time) */}
            {plainTextToken && (
                <Modal isOpen onClose={() => setPlainTextToken(null)} className="max-w-lg p-6">
                    <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
                        {t('account.tokens.createdModalTitle')}
                    </h3>
                    <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
                        {t('account.tokens.createdModalWarning')}
                    </p>
                    <pre className="mb-4 overflow-x-auto rounded bg-gray-100 p-3 text-xs text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                        {plainTextToken}
                    </pre>
                    <Button onClick={() => {
                        navigator.clipboard.writeText(plainTextToken);
                        toast.success(t('account.tokens.copied'));
                    }}>
                        {t('account.tokens.copy')}
                    </Button>
                </Modal>
            )}

            {/* Create token modal */}
            <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} className="max-w-md p-6">
                <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">{t('account.tokens.newTokenTitle')}</h3>
                <div className="mb-3">
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        {t('account.tokens.tokenNameLabel')}
                    </label>
                    <input
                        type="text"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                        placeholder={t('account.tokens.tokenNamePlaceholder')}
                        value={newTokenName}
                        onChange={(e) => setNewTokenName(e.target.value)}
                        maxLength={100}
                    />
                </div>
                <div className="mb-6">
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        {t('account.tokens.expiryDateLabel')}
                    </label>
                    <input
                        type="date"
                        title={t('account.tokens.expiryDateLabel')}
                        placeholder="jj/mm/aaaa"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                        value={newTokenExpiry}
                        onChange={(e) => setNewTokenExpiry(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                    />
                </div>
                <div className="flex justify-end gap-3">
                    <Button variant="outline" onClick={() => setIsCreateOpen(false)} disabled={isCreating}>
                        {t('common.cancel')}
                    </Button>
                    <Button onClick={handleCreate} isLoading={isCreating} disabled={!newTokenName.trim()}>
                        {t('common.create')}
                    </Button>
                </div>
            </Modal>
        </div>
    );
};

export default ApiKeysSection;
