import { ApolloServer } from '@apollo/server'
import { typeDefs } from '../schema/typeDefs'
import { resolvers } from '../schema/resolvers'
import { Neo4jService } from '../database/neo4j'

const GET_JOBS_WITH_DISPATCHER_FILTER = `
  query GetJobs($filters: JobFilters, $pagination: PaginationInput) {
    jobs(filters: $filters, pagination: $pagination) {
      nodes {
        id
        jobDate
        invoiceStatus
        dispatcher {
          id
          name
        }
        jobType {
          title
        }
      }
      totalCount
    }
  }
`

async function testJobsDispatcherFilter() {
  const neo4j = new Neo4jService()
  
  try {
    console.log('🔍 Testing GraphQL jobs query with dispatcher filter...')
    
    // First, get a sample dispatcher
    const dispatchersQuery = `
      MATCH (d:Dispatcher)
      RETURN d.id as id, d.name as name
      LIMIT 3
    `
    
    const dispatchers = await neo4j.runQuery(dispatchersQuery)
    
    if (dispatchers.length === 0) {
      console.log('❌ No dispatchers found')
      return
    }
    
    console.log(`📊 Found ${dispatchers.length} dispatchers:`)
    dispatchers.forEach((d: any) => console.log(`  - ${d.name} (${d.id})`))
    
    // Create Apollo Server instance
    const server = new ApolloServer({
      typeDefs,
      resolvers,
    })
    
    await server.start()
    
    for (const dispatcher of dispatchers.slice(0, 2)) { // Test first 2 dispatchers
      console.log(`\n🔎 Testing jobs filter for dispatcher: ${dispatcher.name}`)
      
      // Test the GraphQL query with dispatcher filter
      const result = await server.executeOperation({
        query: GET_JOBS_WITH_DISPATCHER_FILTER,
        variables: {
          filters: {
            dispatcherId: dispatcher.id
          },
          pagination: {
            page: 1,
            limit: 5
          }
        }
      }, {
        contextValue: {
          neo4jService: neo4j
        }
      })
      
      if (result.body.kind === 'single') {
        const data = result.body.singleResult.data as any
        const errors = result.body.singleResult.errors
        
        if (errors) {
          console.log('❌ GraphQL errors:', errors)
          continue
        }
        
        if (data?.jobs) {
          console.log(`   ✅ Found ${data.jobs.totalCount} jobs for ${dispatcher.name}`)
          console.log(`   📋 Sample jobs (showing ${data.jobs.nodes.length}):`)
          
          data.jobs.nodes.forEach((job: any) => {
            console.log(`     - ${job.id.slice(-6)}: ${job.jobType?.title || 'Unknown'} (${job.jobDate})`)
            console.log(`       Dispatcher: ${job.dispatcher?.name || 'N/A'} - Status: ${job.invoiceStatus}`)
          })
          
          // Verify all jobs are from the correct dispatcher
          const wrongDispatcher = data.jobs.nodes.find((job: any) => 
            job.dispatcher?.id !== dispatcher.id
          )
          
          if (wrongDispatcher) {
            console.log(`❌ Found job from wrong dispatcher! Job: ${wrongDispatcher.id}, Expected: ${dispatcher.id}, Got: ${wrongDispatcher.dispatcher?.id}`)
          } else {
            console.log(`   ✅ All jobs correctly filtered to dispatcher ${dispatcher.name}`)
          }
        } else {
          console.log(`   ❌ No jobs data returned`)
        }
      }
    }
    
    // Test without filter to see total jobs
    console.log(`\n🔎 Testing jobs query without filter:`)
    const allJobsResult = await server.executeOperation({
      query: GET_JOBS_WITH_DISPATCHER_FILTER,
      variables: {
        pagination: {
          page: 1,
          limit: 5
        }
      }
    }, {
      contextValue: {
        neo4jService: neo4j
      }
    })
    
    if (allJobsResult.body.kind === 'single') {
      const data = allJobsResult.body.singleResult.data as any
      if (data?.jobs) {
        console.log(`   ✅ Total jobs without filter: ${data.jobs.totalCount}`)
      }
    }
    
    await server.stop()
    console.log('\n✅ GraphQL jobs dispatcher filter test completed')
    
  } catch (error) {
    console.error('❌ Error testing jobs dispatcher filter:', error)
  } finally {
    await neo4j.close()
  }
}

testJobsDispatcherFilter()
