/**
 * TemplateEditor Component
 * Form for creating and editing templates
 */

import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormHelperText,
  Button,
  IconButton,
  Chip,
  Paper,
  Alert,
  CircularProgress,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Close as CloseIcon,
  Save as SaveIcon,
  Add as AddIcon,
  Upload as UploadIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTemplate, useTemplateMutations } from './hooks/useTemplates';
import type {
  TemplateEditorProps,
  TemplateCategory,
  LayerType,
  TemplateVisibility,
  CreateTemplateDTO,
} from './types/template.types';
import { TEMPLATE_CATEGORIES, LAYER_TYPES, VISIBILITY_OPTIONS } from './types/template.types';
import { isValidThumbnailFile, getDefaultThumbnail } from './utils/templateUtils';

// ============================================
// Validation Schema
// ============================================

const templateSchema = z.object({
  name: z
    .string()
    .min(3, 'Name must be at least 3 characters')
    .max(100, 'Name must be less than 100 characters')
    .regex(/^[a-zA-Z0-9\s\-_]+$/, 'Name can only contain letters, numbers, spaces, hyphens, and underscores'),
  description: z
    .string()
    .max(1000, 'Description must be less than 1000 characters')
    .optional(),
  category: z.enum([
    'network_foundation',
    'compute_platform',
    'storage_database',
    'security',
    'monitoring',
    'fullstack',
    'custom',
  ] as const),
  layerType: z.enum(['network', 'platform', 'devops', 'fullstack'] as const).optional(),
  visibility: z.enum(['private', 'organization', 'public'] as const).default('private'),
  tags: z.array(z.string().max(30)).max(10).optional(),
});

type TemplateFormData = z.infer<typeof templateSchema>;

// ============================================
// Tags Input Component
// ============================================

interface TagsInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  error?: boolean;
  helperText?: string;
}

function TagsInput({ value, onChange, error, helperText }: TagsInputProps) {
  const [inputValue, setInputValue] = useState('');

  const handleAddTag = () => {
    const tag = inputValue.trim().toLowerCase();
    if (tag && !value.includes(tag) && value.length < 10) {
      onChange([...value, tag]);
      setInputValue('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
    if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  const handleDeleteTag = (tagToDelete: string) => {
    onChange(value.filter((tag) => tag !== tagToDelete));
  };

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 0.5,
          p: 1,
          border: 1,
          borderColor: error ? 'error.main' : 'divider',
          borderRadius: 1,
          minHeight: 48,
          alignItems: 'flex-start',
        }}
      >
        {value.map((tag) => (
          <Chip
            key={tag}
            label={tag}
            size="small"
            onDelete={() => handleDeleteTag(tag)}
          />
        ))}
        <TextField
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleAddTag}
          placeholder={value.length === 0 ? 'Add tags...' : ''}
          variant="standard"
          InputProps={{ disableUnderline: true }}
          sx={{ flex: 1, minWidth: 100 }}
          size="small"
        />
      </Box>
      {helperText && (
        <FormHelperText error={error}>{helperText}</FormHelperText>
      )}
      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
        {value.length}/10 tags (Press Enter to add)
      </Typography>
    </Box>
  );
}

// ============================================
// Thumbnail Uploader Component
// ============================================

interface ThumbnailUploaderProps {
  value?: string;
  category: TemplateCategory;
  onUpload: (file: File) => void;
  onGenerate?: () => void;
}

function ThumbnailUploader({ value, category, onUpload, onGenerate }: ThumbnailUploaderProps) {
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = isValidThumbnailFile(file);
    if (!validation.valid) {
      setError(validation.error || 'Invalid file');
      return;
    }

    setError(null);
    onUpload(file);
  };

  return (
    <Box>
      <Typography variant="subtitle2" gutterBottom>
        Thumbnail
      </Typography>
      <Box sx={{ display: 'flex', gap: 2 }}>
        <Paper
          variant="outlined"
          sx={{
            width: 200,
            height: 133,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            bgcolor: 'grey.50',
          }}
        >
          <img
            src={value || getDefaultThumbnail(category)}
            alt="Template thumbnail"
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'cover',
            }}
          />
        </Paper>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Button
            component="label"
            variant="outlined"
            size="small"
            startIcon={<UploadIcon />}
          >
            Upload
            <input
              type="file"
              hidden
              accept="image/png,image/jpeg,image/webp"
              onChange={handleFileChange}
            />
          </Button>
          {onGenerate && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<RefreshIcon />}
              onClick={onGenerate}
            >
              Auto-generate
            </Button>
          )}
        </Box>
      </Box>
      {error && (
        <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
          {error}
        </Typography>
      )}
      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
        PNG, JPG, or WebP. Max 500KB.
      </Typography>
    </Box>
  );
}

// ============================================
// Main Component
// ============================================

export function TemplateEditor({
  mode,
  templateId,
  initialData,
  onSave,
  onCancel,
}: TemplateEditorProps) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));

  const { data: existingTemplate, isLoading: isLoadingTemplate } = useTemplate(
    templateId || '',
    mode === 'edit' && !!templateId
  );

  const { create, update, isLoading: isMutating } = useTemplateMutations();

  const [thumbnail, setThumbnail] = useState<string | undefined>(
    existingTemplate?.thumbnail || initialData?.thumbnail
  );

  // Form setup
  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
    watch,
    setValue,
  } = useForm<TemplateFormData>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: existingTemplate?.name || initialData?.name || '',
      description: existingTemplate?.description || initialData?.description || '',
      category: existingTemplate?.category || initialData?.category || 'custom',
      layerType: existingTemplate?.layerType || initialData?.layerType,
      visibility: existingTemplate?.visibility || initialData?.visibility || 'private',
      tags: existingTemplate?.tags || initialData?.tags || [],
    },
    mode: 'onChange',
  });

  const currentCategory = watch('category');
  const currentTags = watch('tags') || [];

  // Handle thumbnail upload
  const handleThumbnailUpload = useCallback((file: File) => {
    // Convert to base64 for preview (in production, upload to server)
    const reader = new FileReader();
    reader.onload = (e) => {
      setThumbnail(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  // Handle form submission
  const onSubmit = async (data: TemplateFormData) => {
    try {
      if (mode === 'create') {
        const createData: CreateTemplateDTO = {
          ...data,
          templateData: initialData?.templateData || { nodes: [], edges: [], metadata: {} },
        };
        const result = await create.mutateAsync(createData);
        onSave(result);
      } else if (templateId) {
        const result = await update.mutateAsync({
          id: templateId,
          data: {
            ...data,
            thumbnail,
          },
        });
        onSave(result);
      }
    } catch (error) {
      console.error('Failed to save template:', error);
    }
  };

  const isLoading = isLoadingTemplate || isMutating;

  return (
    <Dialog
      open
      onClose={onCancel}
      maxWidth="md"
      fullWidth
      fullScreen={fullScreen}
      aria-labelledby="template-editor-title"
    >
      {/* Header */}
      <DialogTitle sx={{ m: 0, p: 2 }} id="template-editor-title">
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" component="h2">
            {mode === 'create' ? 'Create Template' : 'Edit Template'}
          </Typography>
          <IconButton onClick={onCancel} aria-label="Close editor">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      {/* Content */}
      <DialogContent dividers>
        {create.isError || update.isError ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            Failed to save template. Please try again.
          </Alert>
        ) : null}

        <Box
          component="form"
          onSubmit={handleSubmit(onSubmit)}
          sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}
        >
          {/* Name */}
          <Controller
            name="name"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Template Name"
                required
                fullWidth
                error={!!errors.name}
                helperText={errors.name?.message}
                placeholder="e.g., Production VPC Setup"
              />
            )}
          />

          {/* Description */}
          <Controller
            name="description"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Description"
                multiline
                rows={3}
                fullWidth
                error={!!errors.description}
                helperText={errors.description?.message || 'Optional. Max 1000 characters.'}
                placeholder="Describe what this template includes and when to use it..."
              />
            )}
          />

          {/* Category and Layer Type */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Controller
              name="category"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth required error={!!errors.category}>
                  <InputLabel>Category</InputLabel>
                  <Select {...field} label="Category">
                    {TEMPLATE_CATEGORIES.map(({ value, label }) => (
                      <MenuItem key={value} value={value}>
                        {label}
                      </MenuItem>
                    ))}
                  </Select>
                  {errors.category && (
                    <FormHelperText>{errors.category.message}</FormHelperText>
                  )}
                </FormControl>
              )}
            />

            <Controller
              name="layerType"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth>
                  <InputLabel>Layer Type</InputLabel>
                  <Select {...field} label="Layer Type" value={field.value || ''}>
                    <MenuItem value="">
                      <em>None</em>
                    </MenuItem>
                    {LAYER_TYPES.map(({ value, label }) => (
                      <MenuItem key={value} value={value}>
                        {label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            />
          </Box>

          {/* Visibility */}
          <Controller
            name="visibility"
            control={control}
            render={({ field }) => (
              <FormControl fullWidth>
                <InputLabel>Visibility</InputLabel>
                <Select {...field} label="Visibility">
                  {VISIBILITY_OPTIONS.map(({ value, label }) => (
                    <MenuItem key={value} value={value}>
                      {label}
                    </MenuItem>
                  ))}
                </Select>
                <FormHelperText>
                  Private: Only you can see. Organization: Team members can see. Public: Everyone
                  can see.
                </FormHelperText>
              </FormControl>
            )}
          />

          {/* Tags */}
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Tags
            </Typography>
            <Controller
              name="tags"
              control={control}
              render={({ field }) => (
                <TagsInput
                  value={field.value || []}
                  onChange={field.onChange}
                  error={!!errors.tags}
                  helperText={errors.tags?.message}
                />
              )}
            />
          </Box>

          {/* Thumbnail */}
          <ThumbnailUploader
            value={thumbnail}
            category={currentCategory}
            onUpload={handleThumbnailUpload}
          />
        </Box>
      </DialogContent>

      {/* Actions */}
      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          startIcon={isLoading ? <CircularProgress size={20} /> : <SaveIcon />}
          onClick={handleSubmit(onSubmit)}
          disabled={isLoading || !isValid}
        >
          {mode === 'create' ? 'Create Template' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default TemplateEditor;
