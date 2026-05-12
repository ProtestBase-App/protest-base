import api from './api';
import {
  EventTemplate,
  ParsedEventTemplate,
  CreateTemplateRequest,
  UpdateTemplateRequest,
  GetTemplatesQuery,
  GetTemplatesResponse,
  GetTemplateResponse,
} from '@/types/template.types';
import { API_LIMITS } from '@/constants/ApiConfig';

/**
 * Parse the event_data JSON string into an object.
 * Falls back to an empty object on parse failure.
 */
const parseTemplate = (template: EventTemplate): ParsedEventTemplate => {
  let parsedEventData = {};
  try {
    parsedEventData = JSON.parse(template.event_data);
  } catch {
    parsedEventData = {};
  }

  return {
    ...template,
    event_data: parsedEventData,
  };
};

/**
 * Get all templates for the current user.
 *
 * @param query - Optional query parameters (limit, offset)
 * @returns Array of parsed templates
 */
export async function getTemplates(query: GetTemplatesQuery = {}): Promise<ParsedEventTemplate[]> {
  try {
    const { limit = API_LIMITS.TEMPLATES_DEFAULT, offset = 0, organization_id } = query;

    const params: Record<string, string | number> = { limit, offset };
    if (organization_id) {
      params.organization_id = organization_id;
    }

    const response = await api.get<GetTemplatesResponse>('/templates', {
      params,
    });

    const responseData = response.data;

    if (!responseData.success) {
      throw new Error('Failed to fetch templates');
    }

    // Backend has historically returned templates under three shapes; accept all:
    //   1. { success, data: [...] }
    //   2. { success, data: { data: [...] } }
    //   3. { success, data: { templates: [...] } }
    let templates: EventTemplate[] = [];

    if (Array.isArray(responseData.data)) {
      templates = responseData.data;
    } else if (responseData.data && typeof responseData.data === 'object') {
      const nestedData = responseData.data as unknown as {
        data?: EventTemplate[];
        templates?: EventTemplate[];
      };
      if (Array.isArray(nestedData.data)) {
        templates = nestedData.data;
      } else if (Array.isArray(nestedData.templates)) {
        templates = nestedData.templates;
      }
    }

    return templates.map(parseTemplate);
  } catch (error: any) {
    if (error.response?.status === 401) {
      throw new Error('Please log in to view your templates');
    }

    throw new Error(error.response?.data?.error || error.message || 'Failed to fetch templates');
  }
}

/**
 * Get a single template by ID.
 *
 * @param templateId - The ID of the template to fetch
 * @returns The parsed template object
 */
export async function getTemplate(templateId: string): Promise<ParsedEventTemplate> {
  try {
    const response = await api.get<GetTemplateResponse>(`/templates/${templateId}`);

    if (!response.data.success) {
      throw new Error('Failed to fetch template');
    }

    return parseTemplate(response.data.data);
  } catch (error: any) {
    if (error.response?.status === 404) {
      throw new Error('Template not found');
    }
    if (error.response?.status === 403) {
      throw new Error('Access denied');
    }
    if (error.response?.status === 401) {
      throw new Error('Please log in to view this template');
    }

    throw new Error(error.response?.data?.error || error.message || 'Failed to fetch template');
  }
}

/**
 * Create a new template.
 *
 * @param templateData - The template data to create
 * @returns The created parsed template
 */
export async function createTemplate(
  templateData: CreateTemplateRequest
): Promise<ParsedEventTemplate> {
  try {
    const response = await api.post<GetTemplateResponse>('/templates', templateData);

    if (!response.data.success) {
      throw new Error('Failed to create template');
    }

    return parseTemplate(response.data.data);
  } catch (error: any) {
    if (error.response?.status === 401) {
      throw new Error('Please log in to create a template');
    }
    if (error.response?.data?.code === 'TEMPLATE_NAME_TOO_LONG') {
      throw new Error('Template name is too long (max 100 characters)');
    }
    if (error.response?.data?.code === 'EVENT_DATA_TOO_LARGE') {
      throw new Error('Template data is too large');
    }

    throw new Error(error.response?.data?.error || error.message || 'Failed to create template');
  }
}

/**
 * Update an existing template.
 *
 * @param templateId - The ID of the template to update
 * @param updates - The template data updates
 * @returns The updated parsed template
 */
export async function updateTemplate(
  templateId: string,
  updates: UpdateTemplateRequest
): Promise<ParsedEventTemplate> {
  try {
    const response = await api.put<GetTemplateResponse>(`/templates/${templateId}`, updates);

    if (!response.data.success) {
      throw new Error('Failed to update template');
    }

    return parseTemplate(response.data.data);
  } catch (error: any) {
    if (error.response?.status === 404) {
      throw new Error('Template not found');
    }
    if (error.response?.status === 403) {
      throw new Error('You do not have permission to update this template');
    }
    if (error.response?.status === 401) {
      throw new Error('Please log in to update this template');
    }
    if (error.response?.data?.code === 'TEMPLATE_NAME_TOO_LONG') {
      throw new Error('Template name is too long (max 100 characters)');
    }
    if (error.response?.data?.code === 'EVENT_DATA_TOO_LARGE') {
      throw new Error('Template data is too large');
    }

    throw new Error(error.response?.data?.error || error.message || 'Failed to update template');
  }
}

/**
 * Delete a template.
 *
 * @param templateId - The ID of the template to delete
 */
export async function deleteTemplate(templateId: string): Promise<void> {
  try {
    await api.delete(`/templates/${templateId}`);
  } catch (error: any) {
    if (error.response?.status === 404) {
      throw new Error('Template not found');
    }
    if (error.response?.status === 403) {
      throw new Error('You do not have permission to delete this template');
    }
    if (error.response?.status === 401) {
      throw new Error('Please log in to delete this template');
    }

    throw new Error(error.response?.data?.error || error.message || 'Failed to delete template');
  }
}
