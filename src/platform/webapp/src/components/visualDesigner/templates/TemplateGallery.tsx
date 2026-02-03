/**
 * TemplateGallery Component
 * Curated showcase of templates with featured, popular, and recent sections
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Chip,
  Paper,
  Skeleton,
  Alert,
  useTheme,
} from '@mui/material';
import {
  ArrowForward as ArrowIcon,
  Star as FeaturedIcon,
  TrendingUp as PopularIcon,
  Schedule as RecentIcon,
  ChevronLeft as PrevIcon,
  ChevronRight as NextIcon,
} from '@mui/icons-material';
import { useTemplates } from './hooks/useTemplates';
import { TemplateCard, TemplateCardSkeleton } from './TemplateCard';
import type { DesignTemplate, TemplateGalleryProps, CloudProvider } from './types/template.types';

// ============================================
// Cloud Provider Filter
// ============================================

const CLOUD_PROVIDERS: { value: CloudProvider | 'all'; label: string; icon: string }[] = [
  { value: 'all', label: 'All', icon: '' },
  { value: 'aws', label: 'AWS', icon: '/icons/aws.svg' },
  { value: 'gcp', label: 'GCP', icon: '/icons/gcp.svg' },
  { value: 'azure', label: 'Azure', icon: '/icons/azure.svg' },
  { value: 'multi', label: 'Multi-Cloud', icon: '/icons/multi-cloud.svg' },
];

interface CloudFilterProps {
  value: CloudProvider | 'all';
  onChange: (value: CloudProvider | 'all') => void;
}

function CloudFilter({ value, onChange }: CloudFilterProps) {
  return (
    <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
      {CLOUD_PROVIDERS.map((provider) => (
        <Chip
          key={provider.value}
          label={provider.label}
          onClick={() => onChange(provider.value)}
          variant={value === provider.value ? 'filled' : 'outlined'}
          color={value === provider.value ? 'primary' : 'default'}
          sx={{ cursor: 'pointer' }}
        />
      ))}
    </Box>
  );
}

// ============================================
// Carousel Component
// ============================================

interface TemplateCarouselProps {
  templates: DesignTemplate[];
  onSelect: (template: DesignTemplate) => void;
  isLoading: boolean;
  error: boolean;
  emptyMessage: string;
}

function TemplateCarousel({
  templates,
  onSelect,
  isLoading,
  error,
  emptyMessage,
}: TemplateCarouselProps) {
  const [startIndex, setStartIndex] = useState(0);
  const visibleCount = 4;

  const canScrollLeft = startIndex > 0;
  const canScrollRight = startIndex + visibleCount < templates.length;

  const handlePrev = () => {
    setStartIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setStartIndex((prev) => Math.min(templates.length - visibleCount, prev + 1));
  };

  if (error) {
    return <Alert severity="error">Failed to load templates</Alert>;
  }

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', gap: 2 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Box key={i} sx={{ flex: '0 0 calc(25% - 12px)' }}>
            <TemplateCardSkeleton viewMode="grid" />
          </Box>
        ))}
      </Box>
    );
  }

  if (templates.length === 0) {
    return (
      <Paper
        variant="outlined"
        sx={{
          p: 4,
          textAlign: 'center',
          bgcolor: 'grey.50',
        }}
      >
        <Typography color="text.secondary">{emptyMessage}</Typography>
      </Paper>
    );
  }

  const visibleTemplates = templates.slice(startIndex, startIndex + visibleCount);

  return (
    <Box sx={{ position: 'relative' }}>
      {/* Left Arrow */}
      {canScrollLeft && (
        <IconButton
          onClick={handlePrev}
          sx={{
            position: 'absolute',
            left: -20,
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 1,
            bgcolor: 'background.paper',
            boxShadow: 2,
            '&:hover': { bgcolor: 'background.paper' },
          }}
          aria-label="Previous templates"
        >
          <PrevIcon />
        </IconButton>
      )}

      {/* Templates */}
      <Box
        sx={{
          display: 'flex',
          gap: 2,
          overflow: 'hidden',
        }}
      >
        {visibleTemplates.map((template) => (
          <Box
            key={template.id}
            sx={{
              flex: '0 0 calc(25% - 12px)',
              minWidth: 0,
            }}
          >
            <TemplateCard
              template={template}
              viewMode="grid"
              onPreview={() => onSelect(template)}
              onApply={() => onSelect(template)}
              onClone={() => onSelect(template)}
            />
          </Box>
        ))}
      </Box>

      {/* Right Arrow */}
      {canScrollRight && (
        <IconButton
          onClick={handleNext}
          sx={{
            position: 'absolute',
            right: -20,
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 1,
            bgcolor: 'background.paper',
            boxShadow: 2,
            '&:hover': { bgcolor: 'background.paper' },
          }}
          aria-label="Next templates"
        >
          <NextIcon />
        </IconButton>
      )}
    </Box>
  );
}

// ============================================
// Section Header Component
// ============================================

interface SectionHeaderProps {
  icon: React.ReactNode;
  title: string;
  onViewAll?: () => void;
}

function SectionHeader({ icon, title, onViewAll }: SectionHeaderProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        mb: 2,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {icon}
        <Typography variant="h6" component="h3" fontWeight={600}>
          {title}
        </Typography>
      </Box>
      {onViewAll && (
        <Button
          endIcon={<ArrowIcon />}
          onClick={onViewAll}
          size="small"
        >
          View All
        </Button>
      )}
    </Box>
  );
}

// ============================================
// Main Component
// ============================================

export function TemplateGallery({ onSelectTemplate }: TemplateGalleryProps) {
  const theme = useTheme();
  const [cloudFilter, setCloudFilter] = useState<CloudProvider | 'all'>('all');

  // Fetch featured templates (would normally have a featured flag)
  const {
    data: featuredData,
    isLoading: featuredLoading,
    error: featuredError,
  } = useTemplates({
    visibility: 'public',
    limit: 6,
    sort: 'usageCount',
    order: 'desc',
  });

  // Fetch popular templates
  const {
    data: popularData,
    isLoading: popularLoading,
    error: popularError,
  } = useTemplates({
    visibility: 'public',
    limit: 10,
    sort: 'usageCount',
    order: 'desc',
  });

  // Fetch recent templates
  const {
    data: recentData,
    isLoading: recentLoading,
    error: recentError,
  } = useTemplates({
    visibility: 'public',
    limit: 10,
    sort: 'createdAt',
    order: 'desc',
  });

  const handleSelectTemplate = (template: DesignTemplate) => {
    onSelectTemplate(template);
  };

  return (
    <Box sx={{ py: 3 }}>
      {/* Cloud Provider Filter */}
      <CloudFilter value={cloudFilter} onChange={setCloudFilter} />

      {/* Featured Section */}
      <Box sx={{ mb: 5 }}>
        <SectionHeader
          icon={<FeaturedIcon color="warning" />}
          title="Featured Templates"
        />
        <TemplateCarousel
          templates={featuredData?.data || []}
          onSelect={handleSelectTemplate}
          isLoading={featuredLoading}
          error={!!featuredError}
          emptyMessage="No featured templates available"
        />
      </Box>

      {/* Popular Section */}
      <Box sx={{ mb: 5 }}>
        <SectionHeader
          icon={<PopularIcon color="success" />}
          title="Popular Templates"
          onViewAll={() => {
            // Navigate to browser with sort=usageCount
          }}
        />
        <TemplateCarousel
          templates={popularData?.data || []}
          onSelect={handleSelectTemplate}
          isLoading={popularLoading}
          error={!!popularError}
          emptyMessage="No popular templates yet"
        />
      </Box>

      {/* Recent Section */}
      <Box sx={{ mb: 5 }}>
        <SectionHeader
          icon={<RecentIcon color="info" />}
          title="Recently Added"
          onViewAll={() => {
            // Navigate to browser with sort=createdAt
          }}
        />
        <TemplateCarousel
          templates={recentData?.data || []}
          onSelect={handleSelectTemplate}
          isLoading={recentLoading}
          error={!!recentError}
          emptyMessage="No recent templates"
        />
      </Box>

      {/* Call to Action */}
      <Paper
        sx={{
          p: 4,
          textAlign: 'center',
          background: `linear-gradient(135deg, ${theme.palette.primary.light} 0%, ${theme.palette.primary.main} 100%)`,
          color: 'white',
        }}
      >
        <Typography variant="h5" gutterBottom fontWeight={600}>
          Create Your Own Template
        </Typography>
        <Typography variant="body1" sx={{ mb: 2, opacity: 0.9 }}>
          Design your infrastructure in the canvas and save it as a reusable template
        </Typography>
        <Button
          variant="contained"
          color="inherit"
          sx={{ color: theme.palette.primary.main }}
        >
          Open Designer
        </Button>
      </Paper>
    </Box>
  );
}

export default TemplateGallery;
