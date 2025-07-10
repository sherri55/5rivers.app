import { neo4jService } from '../database/neo4j';

interface CalculationConfig {
  hstRate: number; // 13% HST in Ontario
  defaultHourlyRate: number;
}

const config: CalculationConfig = {
  hstRate: 0.13, // 13% HST
  defaultHourlyRate: 100, // Default if not specified
};

export class CalculationService {
  
  // ===============================
  // JOB CALCULATIONS
  // ===============================
  
  /**
   * Calculate job gross amount based on job type, hours, loads, etc.
   */
  static async calculateJobGrossAmount(
    jobTypeId: string,
    hours?: number,
    loads?: number,
    weight?: number
  ): Promise<number> {
    const jobTypeResult = await neo4jService.runQuery(`
      MATCH (jt:JobType {id: $jobTypeId})
      RETURN jt.rateOfJob as rate, jt.dispatchType as type
    `, { jobTypeId });

    if (jobTypeResult.length === 0) return 0;

    const { rate, type } = jobTypeResult[0];
    
    switch (type.toLowerCase()) {
      case 'hourly':
        return (hours || 0) * (rate || config.defaultHourlyRate);
      
      case 'load':
        return (loads || 0) * (rate || 0);
      
      case 'tonnage':
        return (weight || 0) * (rate || 0);
      
      default:
        return rate || 0;
    }
  }

  /**
   * Calculate job amount from stored job data
   */
  static async calculateJobAmount(jobId: string): Promise<number> {
    const jobResult = await neo4jService.runQuery(`
      MATCH (j:Job {id: $jobId})-[:OF_TYPE]->(jt:JobType)
      RETURN j.startTime as startTime, 
             j.endTime as endTime,
             j.loads as loads,
             j.weight as weight,
             j.amount as fixedAmount,
             jt.id as jobTypeId,
             jt.rateOfJob as rate,
             jt.dispatchType as type
    `, { jobId });

    if (jobResult.length === 0) return 0;

    const { startTime, endTime, loads, weight, fixedAmount, jobTypeId, rate, type } = jobResult[0];
    
    switch (type?.toLowerCase()) {
      case 'hourly':
        // Calculate hours if time is provided
        let hours = 0;
        if (startTime && endTime) {
          try {
            // Handle different time formats
            let start: Date, end: Date;
            
            // If it's a full datetime string
            if (startTime.includes('T') || startTime.includes(' ')) {
              start = new Date(startTime);
              end = new Date(endTime);
            } else {
              // If it's just time (HH:MM:SS or HH:MM), assume today's date
              const today = new Date().toISOString().split('T')[0];
              start = new Date(`${today}T${startTime}`);
              end = new Date(`${today}T${endTime}`);
              
              // Handle overnight jobs (end time is next day)
              if (end < start) {
                end.setDate(end.getDate() + 1);
              }
            }
            
            if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
              hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
            }
          } catch (error) {
            console.warn(`Error calculating hours for job ${jobId}:`, error);
          }
        }
        return Math.max(0, hours * (parseFloat(rate) || 0));
      
      case 'load':
        return Math.max(0, (parseInt(loads) || 0) * (parseFloat(rate) || 0));
      
      case 'tonnage':
        // Handle weight as an array of floats
        let totalWeight = 0;
        if (weight) {
          if (Array.isArray(weight)) {
            // Already an array of numbers
            totalWeight = weight.reduce((sum: number, w: number) => sum + (parseFloat(String(w)) || 0), 0);
          } else if (typeof weight === 'string') {
            // Legacy string format - parse for backward compatibility
            if (weight.trim().startsWith('[') && weight.trim().endsWith(']')) {
              try {
                const weightsArray = JSON.parse(weight);
                if (Array.isArray(weightsArray)) {
                  totalWeight = weightsArray
                    .map((w: any) => parseFloat(w))
                    .filter((w: number) => !isNaN(w))
                    .reduce((sum: number, w: number) => sum + w, 0);
                }
              } catch (error) {
                console.warn(`Error parsing JSON weight array for job ${jobId}:`, error);
                // Fall back to space-separated parsing
                const weights = weight.split(' ').map(w => parseFloat(w.trim())).filter(w => !isNaN(w));
                totalWeight = weights.reduce((sum, w) => sum + w, 0);
              }
            } else {
              // Split by spaces and sum all weight values
              const weights = weight.split(' ').map(w => parseFloat(w.trim())).filter(w => !isNaN(w));
              totalWeight = weights.reduce((sum, w) => sum + w, 0);
            }
          } else {
            totalWeight = parseFloat(String(weight)) || 0;
          }
        }
        return Math.max(0, totalWeight * (parseFloat(rate) || 0));
      
      case 'fixed':
        // For fixed jobs, use the stored amount or fall back to the job type rate
        return parseFloat(fixedAmount) || parseFloat(rate) || 0;
      
      default:
        console.warn(`Unknown dispatch type for job ${jobId}: ${type}`);
        return 0;
    }
  }

  // ===============================
  // INVOICE CALCULATIONS  
  // ===============================

  /**
   * Calculate invoice subtotal (sum of all job amounts)
   */
  static async calculateInvoiceSubTotal(invoiceId: string): Promise<number> {
    const jobAmounts = await neo4jService.runQuery(`
      MATCH (i:Invoice {id: $invoiceId})<-[:INVOICED_IN]-(j:Job)-[:OF_TYPE]->(jt:JobType)
      RETURN j.id as jobId,
             j.startTime as startTime,
             j.endTime as endTime, 
             j.loads as loads,
             j.weight as weight,
             jt.rateOfJob as rate,
             jt.dispatchType as type
    `, { invoiceId });

    let subTotal = 0;
    for (const job of jobAmounts) {
      // Calculate hours if available
      let hours = 0;
      if (job.startTime && job.endTime) {
        const start = new Date(`1970-01-01T${job.startTime}`);
        let end = new Date(`1970-01-01T${job.endTime}`);
        
        // Handle overnight jobs (end time is next day)
        if (end < start) {
          end.setDate(end.getDate() + 1);
        }
        
        hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      }

      // Calculate job amount based on type
      switch (job.type?.toLowerCase()) {
        case 'hourly':
          subTotal += (hours || 0) * (job.rate || config.defaultHourlyRate);
          break;
        case 'load':
          subTotal += (job.loads || 0) * (job.rate || 0);
          break;
        case 'tonnage':
          subTotal += (parseFloat(job.weight || '0')) * (job.rate || 0);
          break;
        default:
          subTotal += job.rate || 0;
      }
    }

    return Math.round(subTotal * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Get dispatcher commission percentage
   */
  static async getDispatcherCommission(dispatcherId: string): Promise<number> {
    const result = await neo4jService.runQuery(`
      MATCH (d:Dispatcher {id: $dispatcherId})
      RETURN d.commissionPercent as commission
    `, { dispatcherId });

    return result[0]?.commission || 0;
  }

  /**
   * Calculate invoice commission amount
   */
  static async calculateInvoiceCommission(invoiceId: string): Promise<number> {
    const invoiceResult = await neo4jService.runQuery(`
      MATCH (i:Invoice {id: $invoiceId})-[:BILLED_BY]->(d:Dispatcher)
      RETURN d.commissionPercent as commissionPercent
    `, { invoiceId });

    if (invoiceResult.length === 0) return 0;

    const subTotal = await this.calculateInvoiceSubTotal(invoiceId);
    const commissionPercent = invoiceResult[0].commissionPercent || 0;
    
    return Math.round(subTotal * (commissionPercent / 100) * 100) / 100;
  }

  /**
   * Calculate HST on invoice
   */
  static async calculateInvoiceHST(invoiceId: string): Promise<number> {
    const subTotal = await this.calculateInvoiceSubTotal(invoiceId);
    const commission = await this.calculateInvoiceCommission(invoiceId);
    const taxableAmount = subTotal + commission;
    
    return Math.round(taxableAmount * config.hstRate * 100) / 100;
  }

  /**
   * Calculate invoice total
   */
  static async calculateInvoiceTotal(invoiceId: string): Promise<number> {
    const subTotal = await this.calculateInvoiceSubTotal(invoiceId);
    const commission = await this.calculateInvoiceCommission(invoiceId);
    const hst = await this.calculateInvoiceHST(invoiceId);
    
    return Math.round((subTotal + commission + hst) * 100) / 100;
  }

  /**
   * Get complete invoice calculations
   */
  static async getInvoiceCalculations(invoiceId: string) {
    const [subTotal, commission, hst] = await Promise.all([
      this.calculateInvoiceSubTotal(invoiceId),
      this.calculateInvoiceCommission(invoiceId),
      this.calculateInvoiceHST(invoiceId)
    ]);

    const total = Math.round((subTotal + commission + hst) * 100) / 100;

    return {
      subTotal,
      commission,
      hst,
      total,
      commissionRate: await this.getDispatcherCommission(
        (await neo4jService.runQuery(`
          MATCH (i:Invoice {id: $invoiceId})-[:BILLED_BY]->(d:Dispatcher)
          RETURN d.id as dispatcherId
        `, { invoiceId }))[0]?.dispatcherId
      )
    };
  }

  /**
   * Calculate all invoice amounts using simplified structure (no InvoiceLines)
   */
  static async calculateInvoiceAmountsSimplified(invoiceId: string): Promise<{
    subTotal: number;
    commissionRate: number;
    commission: number;
    hst: number;
    total: number;
  }> {
    try {
      // Get invoice relationship amounts directly
      const query = `
        MATCH (i:Invoice {id: $invoiceId})<-[r:INVOICED_IN]-(j:Job)
        MATCH (i)-[:BILLED_BY]->(d:Dispatcher)
        RETURN sum(r.amount) as subTotal, d.commissionPercent as commissionRate
      `;
      
      const result = await neo4jService.runQuery(query, { invoiceId });
      
      if (result.length === 0) {
        return { subTotal: 0, commissionRate: 0, commission: 0, hst: 0, total: 0 };
      }
      
      const subTotal = result[0].subTotal || 0;
      const commissionRate = (result[0].commissionRate || 0) / 100; // Convert percentage to decimal
      const commission = subTotal * commissionRate;
      const hst = (subTotal - commission) * 0.13; // 13% HST on amount after commission
      const total = subTotal - commission + hst;
      
      return {
        subTotal,
        commissionRate: commissionRate * 100, // Return as percentage
        commission,
        hst,
        total
      };
    } catch (error) {
      console.error('Error calculating invoice amounts:', error);
      return { subTotal: 0, commissionRate: 0, commission: 0, hst: 0, total: 0 };
    }
  }

  // ===============================
  // DRIVER CALCULATIONS
  // ===============================

  /**
   * Calculate driver total earnings
   */
  static async calculateDriverTotalEarnings(driverId: string, dateFrom?: string, dateTo?: string): Promise<number> {
    let dateFilter = '';
    const params: any = { driverId };

    if (dateFrom && dateTo) {
      dateFilter = 'AND j.jobDate >= $dateFrom AND j.jobDate <= $dateTo';
      params.dateFrom = dateFrom;
      params.dateTo = dateTo;
    }

    const jobs = await neo4jService.runQuery(`
      MATCH (d:Driver {id: $driverId})<-[:ASSIGNED_TO]-(j:Job)-[:OF_TYPE]->(jt:JobType)
      WHERE j.driverPaid = true ${dateFilter}
      RETURN j.id as jobId,
             j.startTime as startTime,
             j.endTime as endTime,
             j.loads as loads, 
             j.weight as weight,
             jt.rateOfJob as rate,
             jt.dispatchType as type,
             d.hourlyRate as driverRate
    `, params);

    let totalEarnings = 0;
    for (const job of jobs) {
      const jobAmount = await this.calculateJobAmount(job.jobId);
      // Driver typically gets paid their hourly rate or a percentage
      // This would depend on your business logic
      totalEarnings += jobAmount; // Simplified - adjust based on your payment model
    }

    return Math.round(totalEarnings * 100) / 100;
  }

  /**
   * Calculate driver pay for a specific job
   */
  static async calculateDriverPay(jobId: string): Promise<number> {
    const result = await neo4jService.runQuery(`
      MATCH (j:Job {id: $jobId})-[:ASSIGNED_TO]->(d:Driver)
      RETURN d.hourlyRate as driverHourlyRate
    `, { jobId });

    if (result.length === 0) {
      return 0; // No driver assigned or job not found
    }

    const driverHourlyRate = result[0].driverHourlyRate;
    if (!driverHourlyRate) {
      return 0; // No hourly rate set for driver
    }

    // Get the job amount and calculate driver pay as: (amount * hourlyRate) / 100
    const jobAmount = await this.calculateJobAmount(jobId);
    return (jobAmount * driverHourlyRate) / 100;
  }

  // ===============================
  // ANALYTICS CALCULATIONS
  // ===============================

  /**
   * Calculate company statistics
   */
  static async calculateCompanyStats(companyId: string) {
    const jobs = await neo4jService.runQuery(`
      MATCH (c:Company {id: $companyId})-[:HAS_JOB_TYPE]->(jt:JobType)<-[:OF_TYPE]-(j:Job)
      RETURN count(j) as totalJobs,
             collect(j.id) as jobIds
    `, { companyId });

    if (jobs.length === 0) {
      return { totalJobs: 0, totalRevenue: 0, averageJobValue: 0 };
    }

    const { totalJobs, jobIds } = jobs[0];
    let totalRevenue = 0;

    // Calculate revenue for each job
    for (const jobId of jobIds) {
      const jobAmount = await this.calculateJobAmount(jobId);
      totalRevenue += jobAmount;
    }

    return {
      totalJobs,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      averageJobValue: totalJobs > 0 ? Math.round((totalRevenue / totalJobs) * 100) / 100 : 0
    };
  }

  /**
   * Calculate monthly revenue
   */
  static async calculateMonthlyRevenue(year: number, month: number): Promise<number> {
    const monthStr = `${year}-${month.toString().padStart(2, '0')}`;
    
    const jobs = await neo4jService.runQuery(`
      MATCH (j:Job)-[:OF_TYPE]->(jt:JobType)
      WHERE j.jobDate STARTS WITH $monthStr
      RETURN collect(j.id) as jobIds
    `, { monthStr });

    if (jobs.length === 0 || jobs[0].jobIds.length === 0) return 0;

    let monthlyRevenue = 0;
    for (const jobId of jobs[0].jobIds) {
      monthlyRevenue += await this.calculateJobAmount(jobId);
    }

    return Math.round(monthlyRevenue * 100) / 100;
  }

  /**
   * Calculate job hours from start and end time
   */
  static calculateJobHours(job: any): number | null {
    if (!job.startTime || !job.endTime) {
      return null;
    }
    
    try {
      // Parse time strings (HH:MM:SS format)
      const [startHour, startMin] = job.startTime.split(':').map(Number);
      const [endHour, endMin] = job.endTime.split(':').map(Number);
      
      let startMinutes = startHour * 60 + startMin;
      let endMinutes = endHour * 60 + endMin;
      
      // Handle overnight jobs (end time is next day)
      if (endMinutes < startMinutes) {
        endMinutes += 24 * 60; // Add 24 hours in minutes
      }
      
      const totalMinutes = endMinutes - startMinutes;
      return totalMinutes > 0 ? totalMinutes / 60 : null;
    } catch (error) {
      console.error('Error calculating job hours:', error);
      return null;
    }
  }
}

export default CalculationService;
