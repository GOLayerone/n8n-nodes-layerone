import {
  IAuthenticateGeneric,
  ICredentialTestRequest,
  ICredentialType,
  INodeProperties,
} from "n8n-workflow";

/**
 * Credential DocX (LayerOne).
 *
 * Auth : header `X-API-Key` sur toutes les requetes vers https://docx.layerone.fr.
 *
 * Test de validite : `GET /usage-stats`. Cet endpoint appelle
 * `validate_key_or_raise` cote serveur :
 *   - cle valide   -> 200 { "success": true, "stats": {...} }
 *   - cle inconnue -> 401 "Cle API invalide"
 * n8n considere comme succes toute reponse 2xx ; le 401 fait echouer le test.
 * Une regle `responseSuccessBody` rattrape le cas degrade ou le serveur
 * renverrait 200 avec `success: false`.
 */
export class DocXApi implements ICredentialType {
  name = "docXApi";

  displayName = "DocX API (LayerOne)";

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
        "Cle API DocX (en-tete X-API-Key). Creez un compte gratuit sur https://dev.layerone.fr (20 documents offerts/mois), puis generez une cle dans l'onglet « Cles API ».",
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
      baseURL: "https://docx.layerone.fr",
      url: "/usage-stats",
      method: "GET",
    },
    rules: [
      {
        type: "responseSuccessBody",
        properties: {
          key: "success",
          value: false,
          message:
            "Cle API DocX invalide. Verifiez votre cle sur https://dev.layerone.fr.",
        },
      },
    ],
  };
}
