/**
 * TemplateCard Component
 * Individual template card display with actions
 */

import React, { memo, useState } from 'react';
import {
  Card,
  CardContent,
  CardMedia,
  CardActions,
  Typography,
  Chip,
  Box,
  IconButton,
  Tooltip,
  Skeleton,
  useTheme,
} from '@mui/material';
import {
  Visibility as PreviewIcon,
  Add as ApplyIcon,
  ContentCopy as CloneIcon,
  Lock as PrivateIcon,
  Business as OrgIcon,
  Public as PublicIcon,
  Hub as NetworkIcon,
  Memory as ComputeIcon,
  Storage as StorageIcon,
  Security as SecurityIcon,
  Assessment as MonitoringIcon,
  Layers as FullstackIcon,
  Extension as CustomIcon,
} from '@mui/icons-material';
import type { TemplateCardProps, TemplateCategory, TemplateVisibility } from './types/template.types';
import {
  getCategoryColor,
  getCategoryLabel,
  truncateText,
  formatUsageCount,
  getDefaultThumbnail,
} from './utils/templateUtils';

// ============================================
// Icon Mappings
// ============================================

const CATEGORY_ICON_MAP: Record<TemplateCategory, React.ElementType> = {
  network_foundation: NetworkIcon,
  compute_platform: ComputeIcon,
  storage_database: StorageIcon,
  security: SecurityIcon,
  monitoring: MonitoringIcon,
  fullstack: FullstackIcon,
  custom: CustomIcon,
};

const VISIBILITY_ICON_MAP: Record<TemplateVisibility, React.ElementType> = {
  private: PrivateIcon,
  organization: OrgIcon,
  public: PublicIcon,
};

// ============================================
// Component
// ============================================

export const TemplateCard = memo(function TemplateCard({
  template,
  viewMode,
  onPreview,
  onApply,
  onClone,
}: TemplateCardProps) {
  const theme = useTheme();
  const [imageError, setImageError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const CategoryIcon = CATEGORY_ICON_MAP[template.category] || CustomIcon;
  const VisibilityIcon = VISIBILITY_ICON_MAP[template.visibility];
  const categoryColor = getCategoryColor(template.category);

  const handleImageError = () => {
    setImageError(true);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      onPreview();
    }
  };

  // Grid view card
  if (viewMode === 'grid') {
    return (
      <Card
        tabIndex={0}
        role="listitem"
        aria-label={`Template: ${template.name}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onKeyDown={handleKeyDown}
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          cursor: 'pointer',
          transition: 'transform 0.2s, box-shadow 0.2s',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: theme.shadows[8],
          },
          '&:focus-visible': {
            outline: `2px solid ${theme.palette.primary.main}`,
            outlineOffset: 2,
          },
        }}
        onClick={onPreview}
      >
        {/* Thumbnail */}
        <Box sx={{ position: 'relative' }}>
          <CardMedia
            component="img"
            height={160}
            image={imageError ? getDefaultThumbnail(template.category) : template.thumbnail || getDefaultThumbnail(template.category)}
            alt={`${template.name} preview`}
            onError={handleImageError}
            sx={{
              objectFit: 'cover',
              bgcolor: 'grey.100',
            }}
          />

          {/* Category badge overlay */}
          <Chip
            size="small"
            icon={<CategoryIcon sx={{ fontSize: 16 }} />}
            label={getCategoryLabel(template.category)}
            sx={{
              position: 'absolute',
              top: 8,
              left: 8,
              bgcolor: categoryColor,
              color: 'white',
              '& .MuiChip-icon': { color: 'white' },
            }}
          />

          {/* Visibility indicator */}
          <Tooltip title={template.visibility}>
            <Box
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                bgcolor: 'rgba(255,255,255,0.9)',
                borderRadius: '50%',
                p: 0.5,
                display: 'flex',
              }}
            >
              <VisibilityIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
            </Box>
          </Tooltip>

          {/* Hover actions overlay */}
          {isHovered && (
            <Box
              sx={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                bgcolor: 'rgba(0,0,0,0.7)',
                display: 'flex',
                justifyContent: 'center',
                gap: 1,
                py: 1,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <Tooltip title="Preview">
                <IconButton
                  size="small"
                  onClick={onPreview}
                  sx={{ color: 'white' }}
                  aria-label="Preview template"
                >
                  <PreviewIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Apply">
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    onApply();
                  }}
                  sx={{ color: 'white' }}
                  aria-label="Apply template"
                >
                  <ApplyIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Clone">
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClone();
                  }}
                  sx={{ color: 'white' }}
                  aria-label="Clone template"
                >
                  <CloneIcon />
                </IconButton>
              </Tooltip>
            </Box>
          )}
        </Box>

        {/* Content */}
        <CardContent sx={{ flexGrow: 1, pb: 1 }}>
          <Typography
            variant="subtitle1"
            component="h3"
            gutterBottom
            sx={{
              fontWeight: 600,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {truncateText(template.name, 50)}
          </Typography>

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              minHeight: 40,
            }}
          >
            {template.description || 'No description'}
          </Typography>

          {/* Tags */}
          <Box sx={{ mt: 1.5, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {template.tags.slice(0, 3).map((tag) => (
              <Chip
                key={tag}
                label={tag}
                size="small"
                variant="outlined"
                sx={{ fontSize: 11, height: 22 }}
              />
            ))}
            {template.tags.length > 3 && (
              <Chip
                label={`+${template.tags.length - 3}`}
                size="small"
                variant="outlined"
                sx={{ fontSize: 11, height: 22 }}
              />
            )}
          </Box>
        </CardContent>

        {/* Footer */}
        <CardActions sx={{ justifyContent: 'space-between', px: 2, py: 1.5, pt: 0 }}>
          <Typography variant="caption" color="text.secondary">
            {formatUsageCount(template.usageCount)} uses
          </Typography>
          <Typography variant="caption" color="text.secondary">
            v{template.version}
          </Typography>
        </CardActions>
      </Card>
    );
  }

  // List view card
  return (
    <Card
      tabIndex={0}
      role="listitem"
      aria-label={`Template: ${template.name}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onKeyDown={handleKeyDown}
      sx={{
        display: 'flex',
        cursor: 'pointer',
        transition: 'box-shadow 0.2s',
        '&:hover': {
          boxShadow: theme.shadows[4],
        },
        '&:focus-visible': {
          outline: `2px solid ${theme.palette.primary.main}`,
          outlineOffset: 2,
        },
      }}
      onClick={onPreview}
    >
      {/* Thumbnail */}
      <CardMedia
        component="img"
        sx={{ width: 120, height: 90, objectFit: 'cover' }}
        image={imageError ? getDefaultThumbnail(template.category) : template.thumbnail || getDefaultThumbnail(template.category)}
        alt={`${template.name} preview`}
        onError={handleImageError}
      />

      {/* Content */}
      <Box sx={{ display: 'flex', flexGrow: 1, alignItems: 'center', p: 2 }}>
        <Box sx={{ flexGrow: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <Chip
              size="small"
              label={getCategoryLabel(template.category)}
              sx={{
                bgcolor: categoryColor,
                color: 'white',
                fontSize: 11,
                height: 20,
              }}
            />
            <VisibilityIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
          </Box>

          <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 600 }}>
            {truncateText(template.name, 60)}
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {truncateText(template.description || 'No description', 120)}
          </Typography>

          <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="caption" color="text.secondary">
              {formatUsageCount(template.usageCount)} uses
            </Typography>
            <Typography variant="caption" color="text.secondary">
              v{template.version}
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              {template.tags.slice(0, 2).map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: 10, height: 18 }}
                />
              ))}
            </Box>
          </Box>
        </Box>

        {/* Actions */}
        <Box
          sx={{
            display: 'flex',
            gap: 0.5,
            opacity: isHovered ? 1 : 0,
            transition: 'opacity 0.2s',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <Tooltip title="Preview">
            <IconButton size="small" onClick={onPreview} aria-label="Preview template">
              <PreviewIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Apply">
            <IconButton size="small" onClick={onApply} aria-label="Apply template">
              <ApplyIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Clone">
            <IconButton size="small" onClick={onClone} aria-label="Clone template">
              <CloneIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    </Card>
  );
});

// ============================================
// Skeleton Loading
// ============================================

export function TemplateCardSkeleton({ viewMode }: { viewMode: 'grid' | 'list' }) {
  if (viewMode === 'grid') {
    return (
      <Card sx={{ height: '100%' }}>
        <Skeleton variant="rectangular" height={160} />
        <CardContent>
          <Skeleton variant="text" width="60%" />
          <Skeleton variant="text" />
          <Skeleton variant="text" width="80%" />
          <Box sx={{ mt: 1.5, display: 'flex', gap: 0.5 }}>
            <Skeleton variant="rounded" width={50} height={22} />
            <Skeleton variant="rounded" width={50} height={22} />
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ display: 'flex', p: 2, gap: 2 }}>
      <Skeleton variant="rectangular" width={120} height={90} />
      <Box sx={{ flexGrow: 1 }}>
        <Skeleton variant="text" width="30%" height={24} />
        <Skeleton variant="text" width="50%" />
        <Skeleton variant="text" width="70%" />
      </Box>
    </Card>
  );
}

export default TemplateCard;
