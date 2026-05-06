export interface PersonalAccessToken {
    id: number;
    name: string;
    abilities: string[];
    last_used_at: string | null;
    expires_at: string | null;
    created_at: string;
}

export interface CreateTokenFormData {
    name: string;
    expires_at?: string | null;
}

export interface CreateTokenResponse {
    token: Omit<PersonalAccessToken, 'abilities' | 'last_used_at'>;
    plain_text_token: string;
}
