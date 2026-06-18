import {
  IAuthenticateGeneric,
  ICredentialTestRequest,
  ICredentialType,
  INodeProperties,
} from "n8n-workflow";

/**
 * Credential Sign (LayerOne).
 *
 * Auth : header `X-API-Key` sur toutes les requetes vers https://sign.layerone.fr.
 *
 * Test de validite : `GET /v1/documents/n8n-credential-check`. La dependance
 * `validate_bearer_token` s'execute AVANT la recherche du document :
 *   - cle inconnue       -> 401 "Cle API invalide ou inactive"
 *   - cle valide + doc inconnu -> 404 "Document non trouve"
 * On ignore donc toutes les erreurs HTTP SAUF 401/403 : un 404 (cle valide)
 * passe le test, un 401/403 (cle invalide) le fait echouer.
 */
export class SignApi implements ICredentialType {
  name = "signApi";

  displayName = "Sign API (LayerOne)";

  documentationUrl = "https://dev.layerone.fr/integrations.html";

  properties: INodeProperties[] = [
    {
      displayName: "API Key",
      name: "apiKey",
      type: "string",
      typeOptions: { password: true },
      default: "",
      required: true,
      description:
        "Cle API Sign (en-tete X-API-Key). Creez un compte gratuit sur https://dev.layerone.fr (10 signatures offertes/mois), puis generez une cle dans l'onglet « Cles API ».",
    },
  ];

  authenticate: IAuthenticateGeneric = {
    type: "generic",
    properties: {
      headers: {
        "X-API-Key": "={{$credentials.apiKey}}",
      },
    },
  };

  test: ICredentialTestRequest = {
    request: {
      baseURL: "https://sign.layerone.fr",
      url: "/v1/documents/n8n-credential-check",
      method: "GET",
      ignoreHttpStatusErrors: {
        ignore: true,
        except: [401, 403],
      },
    },
    rules: [
      {
        type: "responseCode",
        properties: {
          value: 401,
          message:
            "Cle API Sign invalide. Verifiez votre cle sur https://dev.layerone.fr.",
        },
      },
      {
        type: "responseCode",
        properties: {
          value: 403,
          message:
            "Cle API Sign refusee (acces interdit). Verifiez votre cle sur https://dev.layerone.fr.",
        },
      },
    ],
  };
}
