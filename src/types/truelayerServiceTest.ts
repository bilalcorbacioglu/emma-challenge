
export type TruelayerServiceTest = {
    access_token_valid: Boolean,
    refresh_token_valid: Boolean,
    api_calls?: ApiCall[]
    message?: string,
    created_date: Date,
}

export interface ApiCall {
    endpoint: string;
    time: number;
    req_status: Boolean;
    error?: Error;
}