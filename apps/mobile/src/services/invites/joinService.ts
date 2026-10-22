import { createJoinApi } from '@sistem/api-client';
import { apiClient } from '../api/apiClient';

export { JoinRequestError } from '@sistem/api-client';
export const { previewJoin, acceptJoin } = createJoinApi(apiClient);
