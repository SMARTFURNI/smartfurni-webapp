import { google } from "googleapis";

const CREDENTIALS = {
  type: "service_account",
  project_id: "smartfurni-ai-agent",
  private_key_id: "b1d677c9acaba89554d4ad2fa1b39c30bb0675cc",
  private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCmIjEz7DXD3Fvo\ngbjWQC8EGljip55u+QF6eCvqiI+7M7uLr8kq4m2mZfUvP2UqJXbwYJqbqYtG892Y\nGXX5m5CYNUieraURKtpKKwRMf6NnYOPnaiSDdZdBWYIeiT5RPQ2U9PXiyoBpiMyu\ngaSR6JkajO04BIvIyc1bSqWCeJtiLVT7/Z6S9E/vxt3dsUlIXtKMbiaDdGnMWLtn\ns1U83ieGn2BfCbWQJQoi2qLH1Od6i1n32Hm9nPrUz2MIdDqE3rg9guNXuTwzcx5/\nmn21Hf8o+rObCe7IMJGA9pJuTO+kDVYDIblej8Ex41kXeJ7ODIl1mbwkpwXubrUw\nawixVZIhAgMBAAECggEAATXtaQe0YkOW6YmXzNCQbHr7AVcqh3v/N62BrRacLNzP\nuyZHihgMJ62FXSKyNx2pRs9UE8TR8UKB2k57MTEMm3NYnra8ux82Z9p1kE97eRt4\nEF28u4wt6JRr/JLQS7FtHylZfl2D6eD3lDZOekq5N5E7LFCU1THVR4WdJvzVLbYM\nWN1FZmRDEVRcIhTfnTr2Mo9nM3C7tqLWj+nwToVYauG4GETJHmnrXOzoTmQ1FmO+\njSwDylzFayp+y1ykj8kd8ZKEPIpOSnlbsJhaHMFFfcajnRx0A32qwv0HrbOmbPJv\nSsPnCsu9T7wijWq07W1FLdfYVlaClAS1he1si07LzQKBgQDbIeiYcFQhGVSuPV+C\nAkhfHAXR7FHt3qTrCDcdFjr85rF0UGOJEQls1EKO9pZ5aEWspg5izOZn4yz9ylIF\n5D6ayD7NfHLj1HLoozVqWFE2VhLB8u1pDAIO8GEjbb6NJ/+3XSR0JveBIE1inqNP\neXEwIignhH1HYXizTA61XaAHFQKBgQDCFZuPc29hk+IDb1u5XuIXrTF4dFPwoVW5\nMETvOkFIye9GVyq5L/pdvIOsYbJ+AtFBcXgYyvqtmboAi5RJkjDa2A0cTZsKGCoo\nCdiGJmkKMcIrDoCaq5oSikNUyoJBd3ATqgoPSMaDzRd73x8CKNviT4tkX74L/fRV\nFR+LtZ7h3QKBgCOc+CtGHjYe4sdKjCoZ6t8iM8PxL0OEarMT67kbcszFRVPM+NA+\n55Q7TvHjG4NxsdkkR7RA7rU1k4tPhVMVzCLlpmdI8XcbgO1UEQtOfSxigrvomjL3\nU6JP6MmUPWK9fG61gYYrCxB+SnVbqNjyuLWE55e8jYu7SJ2DH+TT6X0dAoGBAI6f\nklE4YwExy0T68EyojT0Y6OG7mnOaG4SbFA04ogD7Y/os1BiCSVnYzmo+4Qv4xg1x\ndO/DObOY5DbCW5Y09/HaEshZvzULzO7fTV5Hm6kCJ828OoVu1SoKsK/+oPm664GH\n0xyoPjlc3YUJ0Z+kpvEHw0dflCj71jEv9J6WOMuBAoGAVkrNm7G0nDWjdaWpgNwG\nWwPuGlbWYF0jIbxucMAluQy3PM21oTnAgcuVU6I4jSqTCo7ajIJKuhwzWnaAQMQI\n3XsLWSfqQ/9n1mN5qacgH7jcsXipnamzViOJD4fllTHExxlAUdh7SdlNlUu05mO4\nMWMbD+FPVpbtfLNJ3FsT9+8=\n-----END PRIVATE KEY-----\n",
  client_email: "smartfurni-drive@smartfurni-ai-agent.iam.gserviceaccount.com",
  client_id: "104996726049651556176",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/smartfurni-drive%40smartfurni-ai-agent.iam.gserviceaccount.com",
  universe_domain: "googleapis.com",
};

export const ROOT_FOLDER_ID = "1JNiwgZKzoT-Fecmad8p9JCZf_NJcAc_r";

export function getDriveClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: CREDENTIALS,
    scopes: ["https://www.googleapis.com/auth/drive"],
  });
  return google.drive({ version: "v3", auth });
}
