# Unified Modal Pattern Implementation

## Overview
We have successfully implemented a unified modal pattern that consolidates create and edit functionality into single, reusable modals. This ensures consistent UI/UX across all entity management features.

## Implemented Unified Modals

### 1. JobModal
- **Location**: `src/components/modals/JobModal.tsx`
- **Replaces**: `CreateJobModal.tsx` and `JobEditModal.tsx`
- **Features**:
  - Dynamic form fields based on job type (hourly, tonnage, load)
  - Weight values and ticket IDs management
  - Duration calculation for hourly jobs
  - Comprehensive job data validation
  - Assignment management (driver, dispatcher, unit)
  - Status and payment tracking

### 2. DriverModal
- **Location**: `src/components/modals/DriverModal.tsx`
- **Replaces**: `AddDriverModal.tsx` and `DriverEditModal.tsx`
- **Features**:
  - Driver contact information
  - Hourly rate management
  - Description/notes field
  - Form validation

### 3. InvoiceModal
- **Location**: `src/components/modals/InvoiceModal.tsx`
- **Replaces**: `CreateInvoiceModal.tsx` and `EditInvoiceModal.tsx`
- **Features**:
  - Job selection with filtering
  - Automatic total calculation
  - Invoice status management
  - Billing information
  - Notes and documentation

## Updated Pages

### Jobs Page (`src/pages/Jobs.tsx`)
- Uses `JobModal` for both create and edit operations
- Maintains all existing functionality including calendar view
- Consistent UI across list and calendar views

### Drivers Page (`src/pages/Drivers.tsx`)
- Uses `DriverModal` for both create and edit operations
- Preserves existing card layout and functionality

### Invoices Page (`src/pages/Invoices.tsx`)
- Uses `InvoiceModal` for both create and edit operations
- Maintains complex job selection and billing features

## Unified Modal Pattern Structure

```tsx
interface UnifiedModalProps {
  entity?: any // Optional - if provided, it's edit mode; if not, it's create mode
  entityId?: string // Alternative way to specify edit mode with ID
  trigger?: React.ReactNode
  onSuccess?: () => void
}

export function UnifiedModal({ entity, entityId, trigger, onSuccess }: UnifiedModalProps) {
  const isEditMode = !!(entity || entityId)
  
  // State management
  const [isOpen, setIsOpen] = useState(false)
  const [formData, setFormData] = useState(/* initial state */)
  
  // GraphQL operations
  const [createMutation] = useMutation(CREATE_MUTATION)
  const [updateMutation] = useMutation(UPDATE_MUTATION)
  
  // Form reset on modal open/close
  useEffect(() => {
    if (isOpen) {
      if (entity) {
        // Populate form with entity data
        setFormData(/* entity data */)
      } else {
        // Reset form for create mode
        setFormData(/* empty state */)
      }
    }
  }, [entity, isOpen])
  
  const handleSave = async () => {
    try {
      if (isEditMode) {
        await updateMutation({ variables: { input: { id: entity.id, ...formData } } })
      } else {
        await createMutation({ variables: { input: formData } })
      }
      
      setIsOpen(false)
      onSuccess?.()
    } catch (error) {
      // Error handling
    }
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || <Button>{isEditMode ? 'Edit' : 'Create'}</Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Entity' : 'Create New Entity'}</DialogTitle>
        </DialogHeader>
        
        {/* Form content */}
        
        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button onClick={handleSave}>{isEditMode ? 'Save Changes' : 'Create'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

## Benefits

1. **Consistency**: Same UI patterns across all entity management
2. **Maintainability**: Single modal component per entity type
3. **Reduced Code Duplication**: No need for separate create/edit components
4. **Better UX**: Consistent interactions and layouts
5. **Easier Testing**: Single component to test for both create and edit scenarios

## Remaining Entities

The following entities could benefit from the same unified modal pattern:

- **Companies**: `CompanyModal` (create + edit)
- **Dispatchers**: `DispatcherModal` (create + edit) 
- **Units**: `UnitModal` (create + edit)
- **Job Types**: `JobTypeModal` (create + edit)

## Implementation Guidelines

When creating new unified modals:

1. Always include both `entity` and `entityId` props for flexibility
2. Use `useEffect` to reset form data when modal opens
3. Implement proper error handling and success notifications
4. Include form validation as appropriate
5. Maintain existing functionality from separate modals
6. Use consistent button layouts and terminology
7. Include proper loading states for edit mode data fetching

## Migration Notes

- Old separate modal files can be removed after confirming all references are updated
- Import statements in pages need to be updated to use the new unified modals
- Existing functionality should be preserved during migration
- Test both create and edit flows thoroughly after migration
