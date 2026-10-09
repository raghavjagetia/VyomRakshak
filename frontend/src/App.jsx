import { useReveal } from './hooks.js';
import Nav from './components/Nav.jsx';
import Hero from './components/Hero.jsx';
import Method from './components/Method.jsx';
import Desk from './components/Desk.jsx';
import Compare from './components/Compare.jsx';
import Architecture from './components/Architecture.jsx';
import { Risks, Roadmap, Impact, Refs } from './components/Later.jsx';

export default function App() {
  useReveal();
  return (
    <>
      <Nav />
      <Hero />
      <Method />
      <Desk />
      <Compare />
      <Architecture />
      <Risks />
      <Roadmap />
      <Impact />
      <Refs />
    </>
  );
}
