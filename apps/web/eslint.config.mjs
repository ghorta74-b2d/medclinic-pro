import nextConfig from 'eslint-config-next/core-web-vitals'

// Next.js 16 / eslint-config-next 16 ships with eslint-plugin-react-hooks v5,
// which adds three new rules designed for codebases running the React Compiler.
// This project does NOT use the React Compiler, so these rules produce false
// positives on common legitimate patterns (initialisation setState, inline
// sub-components, const reassignment via let). Disable them until we either
// adopt the React Compiler or refactor all the affected patterns.
//
// TODO: revisit when opting into React Compiler (next.config experimental.reactCompiler)
//   react-hooks/set-state-in-effect  — setState inside useEffect (init pattern)
//   react-hooks/static-components   — sub-components defined inside render fn
//   react-hooks/immutability         — let reassignment detected as mutation
const disableReactCompilerRules = {
  rules: {
    'react-compiler/react-compiler': 'off',
    'react-hooks/set-state-in-effect': 'off',
    'react-hooks/static-components': 'off',
    'react-hooks/immutability': 'off',
  },
}

export default [...nextConfig, disableReactCompilerRules]
