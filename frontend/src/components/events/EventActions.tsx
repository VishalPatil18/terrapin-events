/**
 * EventActions Component
 * Admin and organizer actions for events (Edit, Delete, Publish, Approve/Reject)
 */

'use client';

import { Edit, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { Event, EventStatus } from '@/types/event.types';
import { Button } from '@/components/ui/Button';

export interface EventActionsProps {
  event: Event;
  isOrganizer: boolean;
  isAdmin: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onPublish?: () => void;
  onApprove?: () => void;
  onReject?: () => void;
}

export function EventActions({
  event,
  isOrganizer,
  isAdmin,
  onEdit,
  onDelete,
  onPublish,
  onApprove,
  onReject,
}: EventActionsProps) {
  const canEdit = isOrganizer || isAdmin;
  const canDelete = isOrganizer || isAdmin;
  const canPublish = isOrganizer && event.status === EventStatus.DRAFT;
  const canApprove = isAdmin && event.status === EventStatus.PENDING_APPROVAL;

  // If no actions available, don't render
  if (!canEdit && !canDelete && !canPublish && !canApprove) {
    return null;
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions</h3>
      
      <div className="space-y-2">
        {/* Edit Button */}
        {canEdit && onEdit && (
          <Button
            onClick={onEdit}
            variant="outline"
            fullWidth
            className="justify-start"
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit Event
          </Button>
        )}

        {/* Publish Button - for draft events */}
        {canPublish && onPublish && (
          <Button
            onClick={onPublish}
            variant="primary"
            fullWidth
            className="justify-start"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Publish Event
          </Button>
        )}

        {/* Admin Approval Actions */}
        {canApprove && (
          <>
            {onApprove && (
              <Button
                onClick={onApprove}
                variant="primary"
                fullWidth
                className="justify-start bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Approve Event
              </Button>
            )}
            {onReject && (
              <Button
                onClick={onReject}
                variant="danger"
                fullWidth
                className="justify-start"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Reject Event
              </Button>
            )}
          </>
        )}

        {/* Delete Button */}
        {canDelete && onDelete && event.status !== EventStatus.CANCELLED && (
          <Button
            onClick={onDelete}
            variant="danger"
            fullWidth
            className="justify-start"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Cancel Event
          </Button>
        )}
      </div>
    </div>
  );
}
