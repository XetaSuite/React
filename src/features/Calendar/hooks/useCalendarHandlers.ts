import { useCallback, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { EventDropArg, DateSelectArg, EventClickArg } from '@fullcalendar/core';
import type { EventResizeDoneArg } from '@fullcalendar/interaction';
import { showSuccess, showError } from '@/shared/utils/toast';
import { CalendarManager, CalendarEventManager } from '../services/CalendarManager';
import type { FullCalendarEvent, CalendarFilters, CalendarEvent } from '../types';
import { useEntityPermissions } from '@/shared/hooks';
import { useAuth } from '@/features/Auth';

/**
 * Return type for useCalendarData hook
 */
interface UseCalendarDataReturn {
    /** Fetches calendar data for a given date range */
    fetchCalendarData: (start: string, end: string, filters: CalendarFilters) => Promise<void>;
    /** Fetches today's events for the banner */
    fetchTodayEvents: () => Promise<void>;
    /** Handler for FullCalendar's datesSet event */
    handleDatesSet: (dateInfo: { start: Date; end: Date }) => void;
    /** Reference to current date range (for external access) */
    currentDateRange: React.MutableRefObject<{ start: string; end: string } | null>;
}

/**
 * useCalendarData - Hook for managing calendar data fetching
 *
 * Handles:
 * - Initial data load prevention (FullCalendar triggers datesSet on mount)
 * - Date range tracking to prevent duplicate fetches
 * - Calendar events and today's events fetching
 *
 * @param filters - Current filter state
 * @param setEvents - State setter for calendar events
 * @param setTodayEvents - State setter for today's events
 */
export function useCalendarData(
    filters: CalendarFilters,
    setEvents: React.Dispatch<React.SetStateAction<FullCalendarEvent[]>>,
    setTodayEvents: React.Dispatch<React.SetStateAction<FullCalendarEvent[]>>
): UseCalendarDataReturn {
    const { t } = useTranslation();

    // Refs to track state without causing re-renders
    const currentDateRange = useRef<{ start: string; end: string } | null>(null);
    const prevFiltersRef = useRef<CalendarFilters | null>(null);

    /**
     * Fetch calendar events for a specific date range
     */
    const fetchCalendarData = useCallback(async (
        start: string,
        end: string,
        currentFilters: CalendarFilters
    ) => {
        const result = await CalendarManager.getCalendarData({
            ...currentFilters,
            start,
            end,
        });

        if (result.success) {
            setEvents(result.data);
        } else {
            showError(result.error || t('common.error'));
        }
    }, [t, setEvents]);

    /**
     * Fetch today's events for the banner component
     * Only called once on mount
     */
    const fetchTodayEvents = useCallback(async () => {
        const result = await CalendarManager.getTodayEvents();
        if (result.success) {
            setTodayEvents(result.data);
        }
    }, [setTodayEvents]);

    // Fetch today's events once on mount
    useEffect(() => {
        fetchTodayEvents();
    }, [fetchTodayEvents]);

    /**
     * Handler for FullCalendar's datesSet event
     * This is the ONLY entry point for data fetching on date/view changes.
     *
     * On first call: saves filters to prevFiltersRef and fetches data
     * On subsequent calls: only fetches if date range changed
     */
    const handleDatesSet = useCallback((dateInfo: { start: Date; end: Date }) => {
        const start = dateInfo.start.toISOString();
        const end = dateInfo.end.toISOString();

        // Skip if same date range (prevents unnecessary API calls)
        if (currentDateRange.current?.start === start && currentDateRange.current?.end === end) {
            return;
        }

        // Update date range and fetch
        currentDateRange.current = { start, end };
        prevFiltersRef.current = filters;
        fetchCalendarData(start, end, filters);
    }, [fetchCalendarData, filters]);

    /**
     * Refetch when filters actually change (not on initial mount)
     * Compares with previous filters to avoid double-fetch
     */
    useEffect(() => {
        // Skip if no date range yet (FullCalendar hasn't mounted)
        if (!currentDateRange.current) {
            return;
        }

        // Skip if filters haven't actually changed (initial mount case)
        if (
            prevFiltersRef.current !== null &&
            prevFiltersRef.current.show_maintenances === filters.show_maintenances &&
            prevFiltersRef.current.show_incidents === filters.show_incidents
        ) {
            return;
        }

        // Filters changed, update ref and fetch
        prevFiltersRef.current = filters;
        fetchCalendarData(
            currentDateRange.current.start,
            currentDateRange.current.end,
            filters
        );
    }, [filters, fetchCalendarData]);

    return {
        fetchCalendarData,
        fetchTodayEvents,
        handleDatesSet,
        currentDateRange,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// Event Interaction Handlers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Return type for useCalendarEventHandlers hook
 */
interface UseCalendarEventHandlersReturn {
    /** Handler for clicking an event (FullCalendar EventClickArg) */
    handleEventClick: (clickInfo: EventClickArg) => Promise<void>;
    /** Handler for clicking an event directly for banner (FullCalendarEvent) */
    handleBannerEventClick: (event: FullCalendarEvent) => Promise<void>;
    /** Handler for selecting a date range (to create new event) */
    handleDateSelect: (selectInfo: DateSelectArg) => void;
    /** Handler for drag & drop */
    handleEventDrop: (dropInfo: EventDropArg) => Promise<void>;
    /** Handler for resizing events */
    handleEventResize: (resizeInfo: EventResizeDoneArg) => Promise<void>;
}

/**
 * useCalendarEventHandlers - Hook for calendar event interactions
 *
 * Handles:
 * - Event click (open modal or navigate to detail page)
 * - Date selection (create new event)
 * - Drag & drop (update event dates)
 * - Event resize (update event duration)
 *
 * @param setEvents - State setter for optimistic updates
 * @param setSelectedEvent - State setter for selected event (modal)
 * @param setSelectedDateInfo - State setter for selected date info (new event)
 * @param setIsEventModalOpen - State setter for modal visibility
 * @param fetchTodayEvents - Function to refresh today's events
 */
export function useCalendarEventHandlers(
    setEvents: React.Dispatch<React.SetStateAction<FullCalendarEvent[]>>,
    setSelectedEvent: React.Dispatch<React.SetStateAction<CalendarEvent | null>>,
    setSelectedDateInfo: React.Dispatch<React.SetStateAction<{ start: Date; end: Date; allDay: boolean } | null>>,
    setIsEventModalOpen: React.Dispatch<React.SetStateAction<boolean>>,
    fetchTodayEvents: () => Promise<void>
): UseCalendarEventHandlersReturn {
    const { t } = useTranslation();
    const { hasPermission, isOnHeadquarters } = useAuth();

    const permissions = useEntityPermissions("calendarEvent", { hasPermission, isOnHeadquarters });
    const canViewMaintenance = hasPermission('maintenance.view');
    const canViewIncident = hasPermission('incident.view');

    /**
     * Core event processing logic
     * Handles opening modal or navigating based on event type
     */
    const processEventClick = useCallback(async (
        id: string,
        type: string,
        extendedProps?: Record<string, unknown>
    ) => {
        if (type === 'event') {
            if (!permissions.canUpdate) {
                return;
            }
            // Calendar event - open modal for editing
            const eventId = parseInt(id.replace('event_', ''));
            const result = await CalendarEventManager.getById(eventId);
            if (result.success) {
                setSelectedEvent(result.data);
                setSelectedDateInfo(null);
                setIsEventModalOpen(true);
            }
        } else {
            // Maintenance or incident - navigate to detail page if permitted
            const resourceId = extendedProps?.resourceId as number || parseInt(id.split('_')[1]);
            if (type === 'maintenance' && canViewMaintenance) {
                window.location.href = `/maintenances/${resourceId}`;
            } else if (type === 'incident' && canViewIncident) {
                window.location.href = `/incidents/${resourceId}`;
            }
        }
    }, [setSelectedEvent, setSelectedDateInfo, setIsEventModalOpen, permissions.canUpdate, canViewMaintenance, canViewIncident]);

    /**
     * Handle event click from FullCalendar (EventClickArg)
     * - For calendar events: Open edit modal
     * - For maintenances/incidents: Navigate to detail page
     */
    const handleEventClick = useCallback(async (clickInfo: EventClickArg) => {
        const event = clickInfo.event;
        await processEventClick(
            event.id,
            event.extendedProps.type,
            event.extendedProps
        );
    }, [processEventClick]);

    /**
     * Handle event click from simple FullCalendarEvent (for banner, etc.)
     * - For calendar events: Open edit modal
     * - For maintenances/incidents: Navigate to detail page
     */
    const handleBannerEventClick = useCallback(async (event: FullCalendarEvent) => {
        await processEventClick(
            event.id,
            event.type || 'event',
            event.extendedProps
        );
    }, [processEventClick]);

    /**
     * Handle date selection (for creating new event)
     * Opens the modal with pre-filled date information
     */
    const handleDateSelect = useCallback((selectInfo: DateSelectArg) => {
        setSelectedEvent(null);
        setSelectedDateInfo({
            start: selectInfo.start,
            end: selectInfo.end,
            allDay: selectInfo.allDay,
        });
        setIsEventModalOpen(true);
    }, [setSelectedEvent, setSelectedDateInfo, setIsEventModalOpen]);

    /**
     * Update local state after successful drag/drop or resize
     * This prevents the event from visually reverting
     */
    const updateEventInState = useCallback((
        eventId: string,
        start: Date | null,
        end: Date | null,
        allDay: boolean
    ) => {
        setEvents(prevEvents =>
            prevEvents.map(e =>
                e.id === eventId
                    ? {
                        ...e,
                        start: start?.toISOString() || e.start,
                        end: end?.toISOString() ?? null,
                        allDay,
                    }
                    : e
            )
        );
    }, [setEvents]);

    /**
     * Handle event drag & drop
     * Only calendar events can be moved (not maintenances/incidents)
     *
     * When dragging an event:
     * - The start date changes based on where it's dropped
     * - The end date must preserve the original duration
     * - For all-day events without end date, end = start (same day)
     */
    const handleEventDrop = useCallback(async (dropInfo: EventDropArg) => {
        const event = dropInfo.event;
        const type = event.extendedProps.type;

        // Only allow moving calendar events
        if (type !== 'event') {
            dropInfo.revert();
            showError(t('calendar.events.cannotMove'));
            return;
        }

        // Calculate new end date preserving the original duration
        // FullCalendar's delta tells us how much the event was moved
        const { delta, oldEvent } = dropInfo;
        let newEnd: Date | null = null;

        if (oldEvent.end) {
            // Event had an end date - apply the same delta to preserve duration
            newEnd = new Date(oldEvent.end.getTime());
            newEnd.setFullYear(newEnd.getFullYear() + (delta.years || 0));
            newEnd.setMonth(newEnd.getMonth() + (delta.months || 0));
            newEnd.setDate(newEnd.getDate() + (delta.days || 0));
            newEnd.setMilliseconds(newEnd.getMilliseconds() + (delta.milliseconds || 0));
        } else if (event.allDay && event.start) {
            // All-day event without end date - end should be same as start
            newEnd = new Date(event.start);
        }

        // Update dates via API
        const eventId = parseInt(event.id.replace('event_', ''));
        const result = await CalendarEventManager.updateDates(eventId, {
            start_at: event.start?.toISOString() || '',
            end_at: newEnd?.toISOString() || undefined,
            all_day: event.allDay,
        });

        if (result.success) {
            // Update local state to prevent visual revert
            updateEventInState(event.id, event.start, newEnd, event.allDay);
            showSuccess(t('calendar.events.dateUpdated'));
            fetchTodayEvents();
        } else {
            // Revert visual change on error
            dropInfo.revert();
            showError(result.error || t('common.error'));
        }
    }, [t, fetchTodayEvents, updateEventInState]);

    /**
     * Handle event resize
     * Only calendar events can be resized (not maintenances/incidents)
     */
    const handleEventResize = useCallback(async (resizeInfo: EventResizeDoneArg) => {
        const event = resizeInfo.event;
        const type = event.extendedProps.type;

        // Only allow resizing calendar events
        if (type !== 'event') {
            resizeInfo.revert();
            return;
        }

        // Update dates via API
        const eventId = parseInt(event.id.replace('event_', ''));
        const result = await CalendarEventManager.updateDates(eventId, {
            start_at: event.start?.toISOString() || '',
            end_at: event.end?.toISOString() || undefined,
            all_day: event.allDay,
        });

        if (result.success) {
            // Update local state to prevent visual revert
            updateEventInState(event.id, event.start, event.end, event.allDay);
            showSuccess(t('calendar.events.dateUpdated'));
            fetchTodayEvents();
        } else {
            // Revert visual change on error
            resizeInfo.revert();
            showError(result.error || t('common.error'));
        }
    }, [t, fetchTodayEvents, updateEventInState]);

    return {
        handleEventClick,
        handleBannerEventClick,
        handleDateSelect,
        handleEventDrop,
        handleEventResize,
    };
}
