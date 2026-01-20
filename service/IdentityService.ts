import Config from "react-native-config";
import { RegisterPayload, RegisterResponse } from "../model/Register";




// export const ENV = {
//   API_BASE_URL: Config.API_BASE_URL,
// };

// const API_BASE_URL = ENV.API_BASE_URL;
// if (!API_BASE_URL) {
//   throw new Error("SUPABASE_URL is not defined");
// }

export const RegisterUser = async (
  payload: RegisterPayload
): Promise<RegisterResponse> => {
  const response = await fetch(
    `https://crhxcncjzfsmxlsxdnux.supabase.co/functions/v1/authentication/register`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || "Registration failed");
  }

  return result;
};
