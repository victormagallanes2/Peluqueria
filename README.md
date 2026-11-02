# Django ERP (Django + Unfold)

Sistema ERP modular desarrollado en Django con interfaz de administración moderna basada en **Unfold**. 
Diseñado inicialmente para la gestión de Almancén, inventario, compras, ventas y facturacion, con arquitectura preparada para adaptarse a cualquier negocio estandar.


## 🚀 Tecnologías Utilizadas
- **Backend:** Python 3.10+, Django 4.2+
- **Frontend:** Unfold (Dashboard moderno)
- **Base de Datos:** PostgreSQL / SQLite (Desarrollo)
- **Estilos:** Tailwind CSS (Gestionado internamente por Unfold)


## Filosofia

- Solucionar problemas es mas importante que el desarrollo perfecto de ultima tecnologia.
- Menos es mas - Interfaces simples para la comodidad de el usuario.
- Mecanicas de desarrollo rapido, django + Unfold crean los CRUD por ti y la IA agiliza procesos.
- Crear modulos lo mas independiente posible y que sea reutilizable.


## Intrucciones para correr el proyecto:


- python -m venv venv

- source venv/bin/activate  # Linux/Mac

- # O en Windows: venv\Scripts\activate

- git clone https://github.com/victormagallanes2/django_erp.git

- cd django_erp

- pip install -r requirements.txt

- python manage.py makemigrations

- python manage.py migrate

- python manage.py collectstatic

- python manage.py runserver


## Carga de datos inicial


Datos obligatorios para que el proyecto funcione adecuadamente esto incluye, monedas, metodos de pago, grupos y permisos. Situarse donde esta el archivo manage.py y ejecutar:

  - python -m django_erp.configuration.data.load_data_dev


1. Una vez dentro en configuracion - Tasa de cambio, establecer la tasa de cambio al dia segun el bcv.

2. Crear Empresa en el menu configuracion - Empresa y fijar la tasa de iva que pagara en el campo iva.


## Funcionamiento o flujo basico):

1. Crear un Almacen o almacenes que se usara en Almacen - Ubicaciones.

2. Crear productos en Almacen - Productos.

3. Para añadir productos al inventarios se debe crear ordenes de compras.

4. Para restar al inventarios se debe crear ordenes de ventas.


## Mecanica de desarrollo


- Por simplicidad se desarrolla en sqlite3 (Tener cuidado con compatibilidad con postgres).
- Se crean los modelos y se usa el admin para las interfaces y el CRUD, usar librerias que trae unfold por defecto en su core ejemplo widget, inlineform, Graficos Chart.js etc.. este es el link de la documentacion: https://unfoldadmin.com/docs/installation/quickstart/
- Si vas a usar IA como apoyo se recomienda pasar todo el proyecto en un txt para ello se usa gitingest, esto es para que la ia tenga contexto, ademas se recomienda solo crear partes estrictamente supervisada y tener cuidado de no romper lo existente y por ultimo no hacer chat extensos ya que llega un momento en que la IA tiene alucinaciones, entonces es mejor iniciar un chat nuevo y volver a pasar el proyecto actualizado con los ultimos cambios aprobados.
- Los menus se crean en el settings.py en el diccionario UNFOLD



-- 1. Si la base de datos aún no existe, créala primero (si ya existe, omite este paso)
CREATE DATABASE django_erp2;

-- 2. Crear usuario erp_user y establecer contraseña
CREATE USER erp_user WITH PASSWORD '123456';

-- 3. Otorgar permiso de conexión a la base de datos
GRANT CONNECT ON DATABASE django_erp2 TO erp_user;

-- 4. Cambiar a la base de datos de destino (para otorgar permisos a nivel de esquema)
\c django_erp2

-- 5. Otorgar permiso de uso y creación en el esquema public (Django necesita crear tablas)
GRANT ALL ON SCHEMA public TO erp_user;

-- 6. Otorgar permisos sobre todas las tablas y secuencias existentes (por si se ejecuta repetidamente)
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO erp_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO erp_user;

-- 7. Configurar permisos predeterminados para tablas creadas posteriormente (esencial para las migraciones de Django)
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO erp_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO erp_user;







