import {
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	INodeType,
	INodeTypeDescription,
	NodeConnectionTypes,
} from 'n8n-workflow';

/**
 * Construit un corps multipart/form-data avec le fichier .docx binaire d'un item.
 * Utilise le FormData/Blob global de Node (>= 18) : aucune dependance runtime
 * (exigence des noeuds verifies n8n). Le fichier provient d'une propriete binaire
 * de l'item (champ `binaryProperty`), conformement aux conventions n8n.
 */
async function buildTemplateMultipart(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const binaryProperty = this.getNodeParameter('binaryProperty', 'data') as string;
	const binary = this.helpers.assertBinaryData(binaryProperty);
	const buffer = await this.helpers.getBinaryDataBuffer(binaryProperty);
	const filename = binary.fileName ?? 'template.docx';

	const form = new FormData();
	form.append(
		'template',
		new Blob([buffer], {
			type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
		}),
		filename,
	);

	requestOptions.body = form;
	// Laisser n8n / l'environnement fixer le content-type multipart (avec boundary).
	if (requestOptions.headers) {
		delete (requestOptions.headers as Record<string, unknown>)['content-type'];
		delete (requestOptions.headers as Record<string, unknown>)['Content-Type'];
	}
	return requestOptions;
}

export class DocX implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'DocX',
		name: 'docX',
		icon: 'file:docx.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description:
			'Generez des documents Word/PDF et des factures Factur-X depuis des modeles, et gerez vos modeles (LayerOne DocX)',
		defaults: {
			name: 'DocX',
		},
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: [NodeConnectionTypes.Main],
		// eslint-disable-next-line n8n-nodes-base/node-class-description-outputs-wrong
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'docXApi',
				required: true,
			},
		],
		requestDefaults: {
			baseURL: 'https://docx.layerone.fr',
			headers: {
				Accept: 'application/json',
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
					{ name: 'Template', value: 'template' },
					{ name: 'Template Version', value: 'version' },
					{ name: 'Account', value: 'account' },
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
						name: 'Render Document',
						value: 'renderDocument',
						action: 'Render a document (PDF or DOCX) from a template',
						description: 'Generate a PDF or DOCX from a stored template and JSON data',
						routing: {
							request: {
								method: 'POST',
								url: '/render-document',
								headers: {
									'Content-Type': 'application/x-www-form-urlencoded',
								},
								encoding: 'arraybuffer',
								returnFullResponse: true,
							},
							output: {
								postReceive: [
									{
										type: 'binaryData',
										properties: { destinationProperty: 'data' },
									},
								],
							},
						},
					},
					{
						name: 'Render Factur-X Invoice',
						value: 'renderFacturx',
						action: 'Render a factur x invoice from a template',
						description:
							'Generate a Factur-X / PDF-A3 electronic invoice (2026 reform) from a template and JSON data',
						routing: {
							request: {
								method: 'POST',
								url: '/render-facturx',
								headers: {
									'Content-Type': 'application/x-www-form-urlencoded',
								},
								encoding: 'arraybuffer',
								returnFullResponse: true,
							},
							output: {
								postReceive: [
									{
										type: 'binaryData',
										properties: { destinationProperty: 'data' },
									},
								],
							},
						},
					},
				],
				default: 'renderDocument',
			},

			// =========================== TEMPLATE ===========================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['template'] } },
				options: [
					{
						name: 'Upload',
						value: 'uploadTemplate',
						action: 'Upload a new template',
						description: 'Upload a Word (.docx) template to reuse it later by its ID',
						routing: {
							request: { method: 'POST', url: '/client/templates' },
							send: { preSend: [buildTemplateMultipart] },
						},
					},
					{
						name: 'Update',
						value: 'updateTemplate',
						action: 'Update an existing template',
						description:
							'Replace a template with a new version (the previous version is archived automatically)',
						routing: {
							request: {
								method: 'PUT',
								url: '=/client/templates/{{$parameter["templateId"]}}',
							},
							send: { preSend: [buildTemplateMultipart] },
						},
					},
					{
						name: 'Download',
						value: 'downloadTemplate',
						action: 'Download a template file',
						description: 'Download the .docx file of a stored template',
						routing: {
							request: {
								method: 'GET',
								url: '=/client/templates/{{$parameter["templateId"]}}',
								encoding: 'arraybuffer',
								returnFullResponse: true,
							},
							output: {
								postReceive: [
									{
										type: 'binaryData',
										properties: { destinationProperty: 'data' },
									},
								],
							},
						},
					},
					{
						name: 'Delete',
						value: 'deleteTemplate',
						action: 'Delete a template',
						description: 'Permanently delete a template and its full version history',
						routing: {
							request: {
								method: 'DELETE',
								url: '=/client/templates/{{$parameter["templateId"]}}',
							},
						},
					},
					{
						name: 'List',
						value: 'listTemplates',
						action: 'List templates',
						description: 'List the templates stored for the API key',
						routing: {
							request: { method: 'GET', url: '/client/templates' },
							output: {
								postReceive: [
									{
										type: 'rootProperty',
										properties: { property: 'templates' },
									},
								],
							},
						},
					},
				],
				default: 'renderDocument',
			},

			// ======================= TEMPLATE VERSION =======================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['version'] } },
				options: [
					{
						name: 'List Versions',
						value: 'listTemplateVersions',
						action: 'List the archived versions of a template',
						description: 'List the archived version history of a template',
						routing: {
							request: {
								method: 'GET',
								url: '=/client/templates/{{$parameter["templateId"]}}/versions',
							},
							output: {
								postReceive: [
									{
										type: 'rootProperty',
										properties: { property: 'versions' },
									},
								],
							},
						},
					},
					{
						name: 'Download Version',
						value: 'downloadTemplateVersion',
						action: 'Download an archived template version',
						description: 'Download the .docx file of an archived template version',
						routing: {
							request: {
								method: 'GET',
								url: '=/client/templates/{{$parameter["templateId"]}}/versions/{{$parameter["versionId"]}}',
								encoding: 'arraybuffer',
								returnFullResponse: true,
							},
							output: {
								postReceive: [
									{
										type: 'binaryData',
										properties: { destinationProperty: 'data' },
									},
								],
							},
						},
					},
					{
						name: 'Restore Version',
						value: 'restoreTemplateVersion',
						action: 'Restore an archived template version',
						description:
							'Restore an archived version as the active version (the current version is archived first)',
						routing: {
							request: {
								method: 'POST',
								url: '=/client/templates/{{$parameter["templateId"]}}/restore/{{$parameter["versionId"]}}',
							},
						},
					},
				],
				default: 'listTemplateVersions',
			},

			// =========================== ACCOUNT ============================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['account'] } },
				options: [
					{
						name: 'Get Usage Stats',
						value: 'getUsageStats',
						action: 'Get the quota and usage stats',
						description:
							'Return the plan, quota (limit / used / remaining) and usage stats of the API key',
						routing: {
							request: { method: 'GET', url: '/usage-stats' },
						},
					},
				],
				default: 'getUsageStats',
			},

			// ========================= PARAMETERS ==========================
			// template_id (render, download, delete, update, versions, restore)
			{
				displayName: 'Template ID',
				name: 'templateId',
				type: 'string',
				required: true,
				default: '',
				description: 'ID of a template already uploaded via « Upload »',
				displayOptions: {
					show: {
						resource: ['document', 'template', 'version'],
						operation: [
							'renderDocument',
							'renderFacturx',
							'updateTemplate',
							'downloadTemplate',
							'deleteTemplate',
							'listTemplateVersions',
							'downloadTemplateVersion',
							'restoreTemplateVersion',
						],
					},
				},
			},

			// json_data (render-document, render-facturx) -> urlencoded body
			{
				displayName: 'JSON Data',
				name: 'jsonData',
				type: 'string',
				typeOptions: { rows: 4 },
				required: true,
				default: '',
				placeholder: '{"client":"ACME","date":"2026-01-15","total":1200}',
				description: 'Document data as a JSON string',
				displayOptions: {
					show: {
						resource: ['document'],
						operation: ['renderDocument', 'renderFacturx'],
					},
				},
				routing: { send: { type: 'body', property: 'json_data' } },
			},
			{
				displayName: 'Output Format',
				name: 'outputFormat',
				type: 'options',
				options: [
					{ name: 'PDF', value: 'pdf' },
					{ name: 'DOCX', value: 'docx' },
				],
				default: 'pdf',
				description: 'File format of the generated document',
				displayOptions: {
					show: { resource: ['document'], operation: ['renderDocument'] },
				},
				routing: { send: { type: 'body', property: 'output_format' } },
			},
			{
				displayName: 'Output Filename',
				name: 'outputFilename',
				type: 'string',
				default: 'document.pdf',
				description: 'Name of the generated file',
				displayOptions: {
					show: { resource: ['document'], operation: ['renderDocument'] },
				},
				routing: { send: { type: 'body', property: 'output_filename' } },
			},
			{
				displayName: 'Output Filename',
				name: 'outputFilename',
				type: 'string',
				default: 'facture.pdf',
				description: 'Name of the generated file',
				displayOptions: {
					show: { resource: ['document'], operation: ['renderFacturx'] },
				},
				routing: { send: { type: 'body', property: 'output_filename' } },
			},
			// template_id must also go in the urlencoded body for render endpoints
			{
				displayName: 'Send Template ID In Body',
				name: 'templateIdInBody',
				type: 'hidden',
				default: '={{$parameter["templateId"]}}',
				displayOptions: {
					show: {
						resource: ['document'],
						operation: ['renderDocument', 'renderFacturx'],
					},
				},
				routing: { send: { type: 'body', property: 'template_id' } },
			},

			// binaryProperty (upload, update) — name of the input binary field
			{
				displayName: 'Input Binary Field',
				name: 'binaryProperty',
				type: 'string',
				required: true,
				default: 'data',
				hint: 'The name of the input field containing the .docx file to upload',
				description: 'Name of the binary property on the incoming item that holds the .docx file',
				displayOptions: {
					show: {
						resource: ['template'],
						operation: ['uploadTemplate', 'updateTemplate'],
					},
				},
			},

			// version_id (download version, restore version)
			{
				displayName: 'Version ID',
				name: 'versionId',
				type: 'number',
				required: true,
				default: 0,
				description: 'ID of the archived template version',
				displayOptions: {
					show: {
						resource: ['version'],
						operation: ['downloadTemplateVersion', 'restoreTemplateVersion'],
					},
				},
			},

			// optional name filter on list templates
			{
				displayName: 'Name Filter',
				name: 'nameFilter',
				type: 'string',
				default: '',
				description: 'Optional text contained in the template name to filter the list',
				displayOptions: {
					show: { resource: ['template'], operation: ['listTemplates'] },
				},
				routing: { send: { type: 'query', property: 'name' } },
			},
		],
	};
}
