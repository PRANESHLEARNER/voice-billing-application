# Client Data Intake Feature Documentation

## Overview

The Client Data Intake feature is a comprehensive multi-step wizard that guides users through setting up their business information, tax configuration, product catalog, and receipt formatting. This feature is essential for onboarding new clients and ensuring all necessary business data is collected before enabling billing and inventory features.

## Architecture

### Backend Components

#### 1. Data Model (`server/models/ClientData.js`)
- **Purpose**: Mongoose schema for storing client onboarding information
- **Key Fields**:
  - `businessProfile`: Store information and contact details
  - `taxConfig`: Tax regime and GSTIN information
  - `itemMaster`: Product catalog summary and SKU count
  - `receiptSample`: Receipt formatting preferences
  - `files`: Uploaded document metadata
  - `status`: Workflow status (draft, pending_review, complete)
  - `audit`: Creation and modification timestamps

#### 2. API Routes (`server/routes/clientData.js`)
- **Purpose**: Express routes handling client data CRUD operations
- **Endpoints**:
  - `GET /api/client-data` - Fetch client data
  - `PUT /api/client-data` - Update client data
  - `POST /api/client-data/submit` - Submit for review
  - `POST /api/client-data/upload` - File upload with multer
- **Features**:
  - JWT authentication middleware
  - File type validation (CSV, PDF, JPG, PNG)
  - File size limits (5MB max)
  - Error handling and logging

### Frontend Components

#### 1. ClientDataWizard (`components/client-data/client-data-wizard.tsx`)
- **Purpose**: Multi-step form component for data collection
- **Features**:
  - 5-step wizard with progress tracking
  - Real-time validation
  - File upload with drag-and-drop
  - Auto-save draft functionality
  - Multi-language support (English, Tamil, Bilingual)
  - Responsive design

#### 2. ClientDataDashboard (`components/client-data/client-data-dashboard.tsx`)
- **Purpose**: Overview and management interface
- **Features**:
  - Status indicators for each section
  - File management
  - Quick access to wizard
  - Review of submitted data

#### 3. useClientData Hook (`hooks/use-client-data.ts`)
- **Purpose**: State management and API integration
- **Features**:
  - Data fetching and caching
  - Optimistic updates
  - Loading and error states
  - File upload handling

## User Flow

### Step 1: Business Profile
- **Purpose**: Collect basic store information
- **Fields**:
  - Store Name (required)
  - Contact Name (required)
  - Contact Phone (required, phone validation)
  - Contact Email (required, email validation)
- **Validation**: Real-time field validation with error messages
- **Auto-save**: Draft saved after each field change

### Step 2: Tax & Pricing
- **Purpose**: Configure tax settings
- **Fields**:
  - Tax Regime (required) - GST, VAT, etc.
  - GSTIN (required for GST regime, format validation)
  - Rounding Preference (required) - Nearest, Up, Down
- **Validation**: GSTIN format validation for Indian GST

### Step 3: Item Master
- **Purpose**: Upload product catalog
- **Features**:
  - CSV file upload
  - File validation (format, size)
  - SKU count display
  - Upload progress indicator

### Step 4: Receipt Sample
- **Purpose**: Configure receipt formatting
- **Options**:
  - Use system default format
  - Upload custom sample (PDF, JPG, PNG)
  - Add custom notes

### Step 5: Review & Submit
- **Purpose**: Final review and submission
- **Features**:
  - Summary of all entered data
  - File list with download options
  - Submit for review button
  - Status tracking

## Validation Rules

### Business Profile
- Store Name: Required, min 2 characters
- Contact Name: Required, min 2 characters
- Contact Phone: Required, regex: `^\+?[0-9]{10,15}$`
- Contact Email: Required, regex: `^[^\s@]+@[^\s@]+\.[^\s@]+$`

### Tax Configuration
- Tax Regime: Required selection
- GSTIN: Required for GST regime, regex: `^[0-9A-Z]{5}[0-9A-Z]{4}[0-9A-Z]{1}[0-9A-Z]{1}[0-9A-Z]{3}$`
- Rounding Preference: Required selection

### File Upload
- SKU List: CSV format, max 5MB
- Tax Proof: PDF/JPG/PNG, max 5MB
- Receipt Sample: PDF/JPG/PNG, max 5MB

## Multi-Language Support

### Supported Languages
- **English**: Full interface translation
- **Tamil**: Complete Tamil translation for all UI elements
- **Bilingual**: English UI with bilingual PDF generation

### Translation Keys
All client data related translations are prefixed with `client_data_`:
- `client_data_title`: Main wizard title
- `step_business`: Business profile step name
- `validation_required`: Generic required field error
- `validation_email`: Email format error
- etc.

## Error Handling

### Client-Side Errors
- **Validation Errors**: Real-time field validation with specific error messages
- **Network Errors**: Toast notifications for API failures
- **File Upload Errors**: Detailed error messages for format/size issues

### Server-Side Errors
- **Authentication**: 401 responses for unauthorized access
- **Validation**: 400 responses with detailed error messages
- **File Errors**: Proper error handling for upload failures
- **Database Errors**: 500 responses with logging

## Security Considerations

### Authentication
- JWT token validation on all endpoints
- Role-based access control (admin/user)
- User-scoped data access

### File Upload Security
- File type validation using MIME types
- File size limits (5MB)
- Secure file storage with unique names
- Virus scanning (if implemented)

### Data Validation
- Server-side validation for all inputs
- SQL injection prevention with Mongoose
- XSS protection in form fields

## Performance Optimizations

### Frontend
- React.memo for expensive components
- Debounced API calls for auto-save
- Lazy loading of file uploads
- Optimistic updates for better UX

### Backend
- Database indexing on user_id and status
- File compression for uploads
- Caching of frequently accessed data
- Efficient query patterns

## Testing

### Unit Tests
- Component rendering tests
- Validation logic tests
- Hook behavior tests
- API integration tests

### Integration Tests
- End-to-end user flows
- File upload scenarios
- Multi-language functionality
- Error handling scenarios

### Test Coverage
- Target: 90%+ code coverage
- Critical paths: 100% coverage
- Error scenarios: Comprehensive testing

## Deployment Considerations

### Environment Variables
- `NEXT_PUBLIC_API_BASE_URL`: API endpoint
- `UPLOAD_DIR`: File storage location
- `MAX_FILE_SIZE`: Upload size limit

### Database Setup
- ClientData collection creation
- Index creation for performance
- Migration scripts for existing data

### File Storage
- Local storage for development
- Cloud storage (S3/Azure) for production
- Backup and recovery procedures

## Monitoring and Logging

### Application Logs
- User action tracking
- Error logging with stack traces
- Performance metrics
- File upload monitoring

### Analytics
- Feature usage statistics
- Completion rates by step
- Error frequency analysis
- User behavior patterns

## Future Enhancements

### Planned Features
- Bulk SKU import via API
- Advanced tax configuration
- Custom receipt templates
- Integration with accounting software
- Automated data validation

### Technical Improvements
- Real-time collaboration
- Offline mode support
- Progressive web app features
- Advanced analytics dashboard

## Troubleshooting

### Common Issues
1. **File Upload Fails**: Check file size and format
2. **GSTIN Validation**: Ensure correct format
3. **Auto-save Not Working**: Check network connection
4. **Translation Issues**: Verify language context

### Debug Mode
Enable debug mode by setting `DEBUG=true` in environment variables to see detailed logging.

## API Reference

### GET /api/client-data
```javascript
// Response
{
  "businessProfile": { ... },
  "taxConfig": { ... },
  "itemMaster": { ... },
  "receiptSample": { ... },
  "files": [ ... ],
  "status": "draft|pending_review|complete",
  "audit": { ... }
}
```

### PUT /api/client-data
```javascript
// Request body
{
  "businessProfile": { ... },
  "taxConfig": { ... },
  "itemMaster": { ... },
  "receiptSample": { ... }
}
```

### POST /api/client-data/upload
```javascript
// FormData
file: File
type: "SKU_LIST"|"TAX_PROOF"|"BILL_SAMPLE"
```

## Contributing

When contributing to the client data intake feature:

1. Follow existing code patterns and naming conventions
2. Add comprehensive tests for new features
3. Update documentation for any API changes
4. Ensure multi-language support for new UI elements
5. Test accessibility compliance
6. Verify responsive design on all screen sizes

## License

This feature is part of the Inventory Billing Software project and follows the same licensing terms.
