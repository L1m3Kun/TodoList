import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from './mocks/server';

// 매칭되지 않는 요청은 조용히 통과시키지 않고 테스트를 실패시킨다.
// URL 조립 버그(tenantId 누락, 경로 오타 등)를 여기서 잡아낸다.
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
