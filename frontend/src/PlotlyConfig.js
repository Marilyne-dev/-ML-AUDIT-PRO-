import Plotly from 'plotly.js-dist-min';
import createPlotlyComponent from 'react-plotly.js/factory';

// Cette déclaration isolée empêche l'erreur d'initialisation
const Plot = createPlotlyComponent(Plotly);
export default Plot;