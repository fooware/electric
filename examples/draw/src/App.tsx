import React from 'react'
import logo from './logo.svg'
import './App.css'
import './style.css'

import { ElectricDrawApp } from './ElectricDraw'

export default function App() {
  return (
    <div className="App">
      <header>Welcome to your first Electric app!</header>
      <ElectricDrawApp />
      <footer>
        <div>
          <a href="https://electric-sql.com/docs" target="_blank">
            Electric Docs
          </a>
          -
          <a href="https://github.com/electric-sql/electric" target="_blank">
            GitHub Repo
          </a>
          -
          <a
            href="https://github.com/electric-sql/electric/examples/draw"
            target="_blank"
          >
            Electric Draw Code
          </a>
        </div>
        <div>
          <img
            src={logo}
            width="32"
            height="32"
            className="App-logo"
            alt="logo"
          />
        </div>
      </footer>
    </div>
  )
}
