import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Route as RouteIcon } from 'lucide-react';
import { createRoute } from '@/helpers/route-helpers';
import { ICreateRoute } from '@/lib/types/route';
import { useTranslation } from 'react-i18next';
import { PermissionGate } from '@/components/PermissionGate';

interface NewRouteDialogProps {
  onRouteCreated?: (route: any) => void;
}

const ROUTE_TYPES = [
  { value: 'regular', label: 'routes:types.regular' },
  { value: 'express', label: 'routes:types.express' },
  { value: 'alternative', label: 'routes:types.alternative' },
];

export default function NewRouteDialog({ onRouteCreated }: NewRouteDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<ICreateRoute>({
    name: '',
    origin: '',
    destination: '',
    distance_km: 0,
    estimated_duration_hours: 0,
    route_type: 'regular',
    description: '',
    waypoints: '',
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);

    try {
      const newRoute = await createRoute(formData);
      
      toast({
        title: t('common:toast.success'),
        description: t('routes:toast.createSuccess'),
      });
      
      if (onRouteCreated) {
        onRouteCreated(newRoute);
      }
      
      setOpen(false);
      resetForm();
    } catch (error: any) {
      toast({
        title: t('common:toast.error'),
        description: error.message || t('routes:toast.createError'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  function resetForm() {
    setFormData({
      name: '',
      origin: '',
      destination: '',
      distance_km: 0,
      estimated_duration_hours: 0,
      route_type: 'regular',
      description: '',
      waypoints: '',
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <PermissionGate permission="route:create"><DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          {t('routes:actions.new')}
        </Button>
      </DialogTrigger></PermissionGate>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RouteIcon className="w-5 h-5" />
            {t('routes:dialogs.new.title')}
          </DialogTitle>
          <DialogDescription>
            {t('routes:dialogs.new.description')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>{t('routes:fields.name')} <span className="text-destructive">*</span></Label>
            <Input
              placeholder={t('routes:placeholders.name')}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('routes:fields.origin')} <span className="text-destructive">*</span></Label>
              <Input
                placeholder={t('routes:placeholders.origin')}
                value={formData.origin}
                onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>{t('routes:fields.destination')} <span className="text-destructive">*</span></Label>
              <Input
                placeholder={t('routes:placeholders.destination')}
                value={formData.destination}
                onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>{t('routes:fields.distance')} <span className="text-destructive">*</span></Label>
              <Input
                type="number"
                min="0"
                placeholder={t('routes:placeholders.distance')}
                value={formData.distance_km || ''}
                onChange={(e) => setFormData({ ...formData, distance_km: parseInt(e.target.value) || 0 })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>{t('routes:fields.duration')}</Label>
              <Input
                type="number"
                min="0"
                step="0.5"
                placeholder={t('routes:placeholders.duration')}
                value={formData.estimated_duration_hours || ''}
                onChange={(e) => setFormData({ ...formData, estimated_duration_hours: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('routes:fields.type')}</Label>
              <Select
                value={formData.route_type}
                onValueChange={(value) => setFormData({ ...formData, route_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROUTE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {t(type.label)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('routes:fields.waypoints')}</Label>
            <Input
              placeholder={t('routes:placeholders.waypoints')}
              value={formData.waypoints || ''}
              onChange={(e) => setFormData({ ...formData, waypoints: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              {t('routes:hints.waypoints')}
            </p>
          </div>

          <div className="space-y-2">
            <Label>{t('routes:fields.description')}</Label>
            <Textarea
              placeholder={t('routes:placeholders.description')}
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          {formData.distance_km > 0 && (
            <div className="p-3 bg-primary/10 rounded-lg">
              <p className="text-sm font-medium">
                {formData.origin || '...'} → {formData.destination || '...'}: 
                <span className="ml-2">{formData.distance_km} km</span>
                {formData.estimated_duration_hours && formData.estimated_duration_hours > 0 && (
                  <span className="ml-2">
                    (~{formData.estimated_duration_hours}h)
                  </span>
                )}
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t('common:actions.cancel')}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? t('common:actions.creating') : t('routes:actions.create')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}