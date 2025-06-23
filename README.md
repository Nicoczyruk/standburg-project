# Standburg - Sistema de Gestión de Pedidos

![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![NodeJS](https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white)
![Express.js](https://img.shields.io/badge/express.js-%23404d59.svg?style=for-the-badge&logo=express&logoColor=%2361DAFB)

Sistema integral de gestión de pedidos, caja y productos para el restaurante Standburg.

## Sobre el Proyecto

Este proyecto fue desarrollado para ofrecer una solución digital y centralizada que optimice las operaciones diarias del restaurante. El sistema permite gestionar todo el ciclo de vida de un pedido, desde que es tomado por el personal hasta su confirmación y seguimiento.

Funcionalidades principales:
* **Gestión de Pedidos**: Módulo para la toma, confirmación y seguimiento de pedidos de clientes.
* **Administración de Productos**: Interfaz para gestionar el catálogo de productos disponibles.
* **Control de Caja**: Herramientas para administrar movimientos de caja, registrar gastos y realizar arqueos de cierre.
* **Autenticación de Usuarios**: Sistema de login para el personal autorizado.

## Desarrolladores

* **Czyruk Nicolas** - [@Nicoczyruk](https://github.com/Nicoczyruk)
* **Aguirre Gonzalo** - [@gonzahag](https://github.com/gonzahag)
* **Giovanni Pellizzari** - [@Giovanni-Pellizzari](https://github.com/Giovanni-Pellizzari)

## Tecnologías Utilizadas

Este proyecto se divide en un frontend y un backend, utilizando las siguientes tecnologías:

* **Frontend (Cliente)**:
    * React
    * Vite
    * React Router
* **Backend (Servidor)**:
    * Node.js
    * Express
    * JWT (JSON Web Tokens) para autenticación
    * CORS
* **Base de Datos**:
    * Microsoft SQL Server

## Primeros Pasos

Para tener una copia local del proyecto funcionando, sigue estos pasos.

### Prerrequisitos

Asegúrate de tener instalado el siguiente software:
* Node.js (versión LTS recomendada)
* Git

### Instalación

1.  **Clonar el repositorio**
    ```sh
    git clone [https://github.com/Nicoczyruk/standburg-project.git](https://github.com/Nicoczyruk/standburg-project.git)
    ```
2.  **Navegar al directorio del proyecto**
    ```sh
    cd standburg-project
    ```
3.  **Instalar todas las dependencias**
    Este comando instalará las dependencias para el proyecto raíz, el cliente y el servidor.
    ```sh
    npm run install:all
    ```
4.  **Configurar la Base de Datos**
    Utiliza los scripts SQL que se encuentran en el directorio `/database` para crear e inicializar la base de datos en tu instancia de SQL Server.
5.  **Configurar variables de entorno**
    En el directorio `/server`, crea un archivo `.env` y añade las variables necesarias para la conexión a la base de datos y los secretos de JWT.

### Ejecución

Para iniciar tanto el servidor de backend como el cliente de frontend en modo de desarrollo, ejecuta el siguiente comando desde el directorio raíz del proyecto:

```sh
npm run dev
