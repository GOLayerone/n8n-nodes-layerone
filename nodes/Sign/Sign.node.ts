import { INodeType, INodeTypeDescription, NodeConnectionTypes } from 'n8n-workflow';

export class Sign implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Sign',
		name: 'sign',
		icon: 'file:sign.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description:
			'Send PDFs for electronic signature (eIDAS / PAdES), track status, verify identity by SMS and retrieve legal proof (LayerOne Sign)',
		defaults: {
			name: 'Sign',
		},
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: [NodeConnectionTypes.Main],
		// eslint-disable-next-line n8n-nodes-base/node-class-description-outputs-wrong
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'signApi',
				required: true,
			},
		],
		requestDefaults: {
			baseURL: 'https://sign.layerone.fr',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
			},
		},
		properties: [
			// ============================ RESOURCE ============================
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Document', value: 'document' },
					{ name: 'OTP', value: 'otp' },
				],
				default: 'document',
			},

			// =========================== DOCUMENT ===========================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['document'] } },
				options: [
					{
						name: 'Send for Signature',
						value: 'sendForSignature',
						action: 'Send a PDF for electronic signature',
						description:
							'Send a PDF for electronic signature (eIDAS / PAdES) and email the signing invitation',
						routing: {
							request: { method: 'POST', url: '/v1/documents/send' },
						},
					},
					{
						name: 'Detect Fields',
						value: 'detectFields',
						action: 'Detect signature fields in a PDF',
						description: 'Analyze a PDF and return the tagged ([[...]]) signature placeholders',
						routing: {
							request: { method: 'POST', url: '/v1/documents/detect-fields' },
						},
					},
					{
						name: 'Get Status',
						value: 'getStatus',
						action: 'Get the status of a signature request',
						description: 'Check the progress of a signature request (pending, signed, refused...)',
						routing: {
							request: {
								method: 'GET',
								url: '=/v1/documents/{{$parameter["documentId"]}}',
							},
						},
					},
					{
						name: 'Get Audit Certificate',
						value: 'getAuditCertificate',
						action: 'Get the legal proof certificate',
						description:
							'Retrieve the full legal proof certificate (who signed, from which IP, when, with the cryptographic hash chain)',
						routing: {
							request: {
								method: 'GET',
								url: '=/v1/documents/{{$parameter["documentId"]}}/audit',
							},
						},
					},
					{
						name: 'Validate Signature',
						value: 'validateSignature',
						action: 'Validate the integrity of the signature',
						description:
							'Cryptographically verify that the PAdES signature of the document is intact and valid',
						routing: {
							request: {
								method: 'GET',
								url: '=/v1/documents/{{$parameter["documentId"]}}/validate',
							},
						},
					},
					{
						name: 'Download Signed Document',
						value: 'downloadSigned',
						action: 'Download the signed PDF',
						description:
							'Retrieve the final signed PDF (qualified PAdES signature and embedded proof certificate)',
						routing: {
							request: {
								method: 'GET',
								url: '=/v1/documents/{{$parameter["documentId"]}}/download',
							},
						},
					},
					{
						name: 'Cancel',
						value: 'cancelDocument',
						action: 'Cancel a signature request',
						description: 'Cancel a signature request still in progress (impossible once signed)',
						routing: {
							request: {
								method: 'DELETE',
								url: '=/v1/documents/{{$parameter["documentId"]}}',
							},
						},
					},
				],
				default: 'sendForSignature',
			},

			// ============================== OTP =============================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['otp'] } },
				options: [
					{
						name: 'Send OTP (SMS)',
						value: 'sendOtp',
						action: 'Send an SMS verification code',
						description:
							'Send an OTP code by SMS to the signer to verify their identity before signing',
						routing: {
							request: { method: 'POST', url: '/v1/otp/request' },
						},
					},
					{
						name: 'Verify OTP (SMS)',
						value: 'verifyOtp',
						action: 'Verify an SMS verification code',
						description:
							'Validate the OTP code entered by the signer and return the signing URL if the code is correct',
						routing: {
							request: { method: 'POST', url: '/v1/otp/verify' },
						},
					},
				],
				default: 'sendOtp',
			},

			// ========================= PARAMETERS ==========================
			// document_id (status, audit, validate, download, cancel, otp send/verify)
			// document_id in the URL for GET / DELETE operations (no body routing).
			{
				displayName: 'Document ID',
				name: 'documentId',
				type: 'string',
				required: true,
				default: '',
				description: 'ID of the signature document',
				displayOptions: {
					show: {
						resource: ['document'],
						operation: [
							'getStatus',
							'getAuditCertificate',
							'validateSignature',
							'downloadSigned',
							'cancelDocument',
						],
					},
				},
			},
			// document_id in the JSON body for OTP operations (POST).
			{
				displayName: 'Document ID',
				name: 'otpDocumentId',
				type: 'string',
				required: true,
				default: '',
				description: 'ID of the signature document',
				displayOptions: {
					show: {
						resource: ['otp'],
						operation: ['sendOtp', 'verifyOtp'],
					},
				},
				routing: { send: { type: 'body', property: 'document_id' } },
			},

			// ---- Send for signature ----
			{
				displayName: 'PDF (Base64)',
				name: 'pdfBase64',
				type: 'string',
				typeOptions: { rows: 3, password: false },
				required: true,
				default: '',
				description: 'The PDF document content encoded in base64',
				displayOptions: {
					show: {
						resource: ['document'],
						operation: ['sendForSignature', 'detectFields'],
					},
				},
				routing: { send: { type: 'body', property: 'pdf_base64' } },
			},
			{
				displayName: 'Document Name',
				name: 'documentName',
				type: 'string',
				required: true,
				default: '',
				displayOptions: {
					show: { resource: ['document'], operation: ['sendForSignature'] },
				},
				routing: { send: { type: 'body', property: 'document_name' } },
			},
			{
				displayName: 'Signer Name',
				name: 'signerName',
				type: 'string',
				required: true,
				default: '',
				displayOptions: {
					show: { resource: ['document'], operation: ['sendForSignature'] },
				},
				routing: {
					send: { type: 'body', property: 'signers[0].name' },
				},
			},
			{
				displayName: 'Signer Email',
				name: 'signerEmail',
				type: 'string',
				placeholder: 'name@email.com',
				required: true,
				default: '',
				displayOptions: {
					show: { resource: ['document'], operation: ['sendForSignature'] },
				},
				routing: {
					send: { type: 'body', property: 'signers[0].email' },
				},
			},
			{
				displayName: 'Signer Role',
				name: 'signerRole',
				type: 'string',
				default: 'Client',
				displayOptions: {
					show: { resource: ['document'], operation: ['sendForSignature'] },
				},
				routing: {
					send: { type: 'body', property: 'signers[0].role' },
				},
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: { resource: ['document'], operation: ['sendForSignature'] },
				},
				options: [
					{
						displayName: 'Signer Phone',
						name: 'signerPhone',
						type: 'string',
						default: '',
						placeholder: '+33...',
						description: 'Required only when using SMS (OTP) verification',
						routing: { send: { type: 'body', property: 'signers[0].phone' } },
					},
					{
						displayName: 'Note',
						name: 'note',
						type: 'string',
						default: '',
						description: 'Message included in the signing invitation',
						routing: { send: { type: 'body', property: 'note' } },
					},
					{
						displayName: 'Expiry (Days)',
						name: 'expiryDays',
						type: 'number',
						default: 30,
						routing: { send: { type: 'body', property: 'expiry_days' } },
					},
					{
						displayName: 'Company Name',
						name: 'companyName',
						type: 'string',
						default: '',
						description: 'Displayed company name',
						routing: { send: { type: 'body', property: 'company_name' } },
					},
				],
			},

			// ---- OTP send ----
			{
				displayName: 'Signer Email',
				name: 'otpSignerEmail',
				type: 'string',
				placeholder: 'name@email.com',
				required: true,
				default: '',
				displayOptions: {
					show: { resource: ['otp'], operation: ['sendOtp', 'verifyOtp'] },
				},
				routing: { send: { type: 'body', property: 'signer_email' } },
			},
			{
				displayName: 'Signer Phone',
				name: 'otpSignerPhone',
				type: 'string',
				required: true,
				default: '',
				placeholder: '+33...',
				displayOptions: { show: { resource: ['otp'], operation: ['sendOtp'] } },
				routing: { send: { type: 'body', property: 'signer_phone' } },
			},
			{
				displayName: 'Document Name',
				name: 'otpDocumentName',
				type: 'string',
				default: '',
				displayOptions: { show: { resource: ['otp'], operation: ['sendOtp'] } },
				routing: { send: { type: 'body', property: 'document_name' } },
			},

			// ---- OTP verify ----
			{
				displayName: 'Code',
				name: 'otpCode',
				type: 'string',
				required: true,
				default: '',
				description: 'The code received by SMS',
				displayOptions: {
					show: { resource: ['otp'], operation: ['verifyOtp'] },
				},
				routing: { send: { type: 'body', property: 'code' } },
			},
		],
	};
}
