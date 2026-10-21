const KAKAO_AUTHORIZE_URL = "https://kauth.kakao.com/oauth/authorize";

export const KAKAO_OAUTH_STATE_KEY = "gaemi_kakao_oauth_state";

export function createKakaoAuthorizeUrl(clientId: string, redirectUri: string, state: string) {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    state,
  });

  return `${KAKAO_AUTHORIZE_URL}?${params.toString()}`;
}
