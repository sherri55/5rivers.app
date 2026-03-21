import { Router } from 'express';
import healthRoutes from './health.routes';
import authRoutes from './auth.routes';
import companiesRoutes from './companies.routes';
import driversRoutes from './drivers.routes';
import dispatchersRoutes from './dispatchers.routes';
import unitsRoutes from './units.routes';
import jobTypesRoutes from './jobTypes.routes';
import jobsRoutes from './jobs.routes';
import invoicesRoutes from './invoices.routes';
import driverPaymentsRoutes from './driverPayments.routes';
import driverPayRoutes from './driverPay.routes';
import membersRoutes from './members.routes';
import organizationsRoutes from './organizations.routes';
import pdfRoutes from './pdf.routes';

const router = Router();

router.use(healthRoutes);
router.use('/api', authRoutes);
router.use('/api', organizationsRoutes);
router.use('/api', membersRoutes);
router.use('/api', companiesRoutes);
router.use('/api', driversRoutes);
router.use('/api', dispatchersRoutes);
router.use('/api', unitsRoutes);
router.use('/api', jobTypesRoutes);
router.use('/api', jobsRoutes);
router.use('/api', invoicesRoutes);
router.use('/api', driverPaymentsRoutes);
router.use('/api', driverPayRoutes);
router.use('/api', pdfRoutes);

export default router;
