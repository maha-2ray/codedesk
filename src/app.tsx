import React from 'react'
import QueryProvider from './providers/query-provider'

const App: React.FC = () => {
  return (
    <QueryProvider>
      <div className="flex items-center justify-center h-screen bg-red-500"  >
        <h1 className="text-3xl font-bold text-yellow-300" >
          Hello World!
        </h1>
      </div>
    </QueryProvider>
  )
}

export default App
