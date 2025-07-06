import { Neo4jService } from '../database/neo4j'

async function addMultipleJobsSameDate() {
  const neo4jService = new Neo4jService()
  const session = neo4jService.getSession()
  
  try {
    console.log('📅 Adding multiple jobs for the same date to test calendar...\n')
    
    // Get some existing job types and drivers
    const jobTypesResult = await session.run(`
      MATCH (jt:JobType)
      RETURN jt.id as id, jt.title as title
      LIMIT 5
    `)
    
    const driversResult = await session.run(`
      MATCH (d:Driver)
      RETURN d.id as id, d.name as name
      LIMIT 3
    `)
    
    if (jobTypesResult.records.length === 0 || driversResult.records.length === 0) {
      console.log('❌ Need job types and drivers to create test jobs')
      return
    }
    
    const jobTypes = jobTypesResult.records.map(r => ({ 
      id: r.get('id'), 
      title: r.get('title') 
    }))
    const drivers = driversResult.records.map(r => ({ 
      id: r.get('id'), 
      name: r.get('name') 
    }))
    
    // Create 5 jobs for tomorrow's date
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const testDate = tomorrow.toISOString().split('T')[0]
    
    console.log(`Creating jobs for date: ${testDate}`)
    
    const jobs = [
      {
        startTime: '08:00:00',
        endTime: '12:00:00',
        jobTypeId: jobTypes[0].id,
        driverId: drivers[0].id
      },
      {
        startTime: '13:00:00',
        endTime: '17:00:00',
        jobTypeId: jobTypes[1].id,
        driverId: drivers[1].id
      },
      {
        loads: 3,
        jobTypeId: jobTypes[2].id,
        driverId: drivers[0].id
      },
      {
        startTime: '09:30:00',
        endTime: '15:30:00',
        jobTypeId: jobTypes[3].id,
        driverId: drivers[2].id
      },
      {
        weight: '25.5 18.3',
        jobTypeId: jobTypes[4].id,
        driverId: drivers[1].id
      }
    ]
    
    for (let i = 0; i < jobs.length; i++) {
      const jobData = jobs[i]
      const jobId = `test-multi-${Date.now()}-${i}`
      
      await session.run(`
        CREATE (j:Job {
          id: $jobId,
          jobDate: $jobDate,
          invoiceStatus: 'Pending',
          paymentReceived: false,
          driverPaid: false,
          startTime: $startTime,
          endTime: $endTime,
          loads: $loads,
          weight: $weight,
          createdAt: datetime(),
          updatedAt: datetime()
        })
      `, {
        jobId,
        jobDate: testDate,
        startTime: jobData.startTime || null,
        endTime: jobData.endTime || null,
        loads: jobData.loads || null,
        weight: jobData.weight || null
      })
      
      // Connect to job type
      await session.run(`
        MATCH (j:Job {id: $jobId})
        MATCH (jt:JobType {id: $jobTypeId})
        CREATE (j)-[:OF_TYPE]->(jt)
      `, { jobId, jobTypeId: jobData.jobTypeId })
      
      // Connect to driver
      await session.run(`
        MATCH (j:Job {id: $jobId})
        MATCH (d:Driver {id: $driverId})
        CREATE (j)-[:ASSIGNED_TO]->(d)
      `, { jobId, driverId: jobData.driverId })
      
      console.log(`✅ Created job ${i + 1}: ${jobTypes.find(jt => jt.id === jobData.jobTypeId)?.title}`)
    }
    
    console.log(`\n🎉 Created ${jobs.length} jobs for ${testDate}`)
    console.log('Now you can test the calendar view with multiple jobs on the same date!')
    
  } catch (error) {
    console.error('❌ Error adding test jobs:', error)
  } finally {
    await session.close()
  }
}

addMultipleJobsSameDate()
  .then(() => {
    console.log('\n✅ Multi-job test data creation completed')
    process.exit(0)
  })
  .catch(error => {
    console.error('❌ Error:', error)
    process.exit(1)
  })
