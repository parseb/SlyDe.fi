$(document).ready(function() {
           var verticalSlider = document.getElementById('slider-vertical');

           noUiSlider.create(verticalSlider, {
             start: 78,
             direction: 'rtl',
             connect: [false, true],
             tooltips: [wNumb({
               decimals: 0,
               suffix: '°',
             })],
             orientation: 'vertical',
             range: {
               'min': 30,
               'max': 100
             }
           });
         });